'use strict';

import {
  FEATURE_DEFS,
  SECTION_DEFS,
  SETTINGS_EXPORT_SCOPE_DEFS,
  TAB_CONNECTION_NEEDS,
  DEFAULT_IGNORE_KEYS
} from '../constants.js';
import { state } from '../state.js';
import {
  esc,
  getPreviewStateLabel,
  getDiffTypeDisplayLabel,
  getSeverityDisplayLabel,
  classifyStage,
  stageIconChar,
  renderSectionIconHtml,
  severityToneOf,
  severityClass
} from '../utils.js';
import {
  getSelectedDiffRows,
  getRenderedDiffRows,
  resolveDiffExportMode,
  resolveDiffExportContentMode,
  getDiffExportContentLabel,
  buildIgnoreKeySuggestions,
  previewIgnoreKeyImpact
} from '../diff/filter.js';
import { refreshIgnorePresetDropdown } from '../diff/ignore-presets.js';
import {
  getActualDiffRows,
  countActualDiffRows,
  summarizeRows,
  getActiveDiffNormalizationLabels
} from '../diff/engine.js';
import { summarizeSeverity } from '../diff/enrich.js';
import { isReflectNodeModeEffective } from '../reflect/nodeModeUi.js';
import { buildApplyButtonLabel } from '../reflect/footerLabel.js';
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

function cssEscapeLiteral(value) {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(value);
  return String(value).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
}

export function setBusy(isBusy, message = '') {
  const root = ui.status?.closest(`#${cssEscapeLiteral('kintone-unified-suite-v2')}`);
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
  const featureLabel = def?.label || '';
  const sep = '<span class="feature-breadcrumb__sep" aria-hidden="true">/</span>';
  const home = `<button type="button" class="feature-breadcrumb__link" data-act="breadcrumbHome" title="ランチャーへ戻る">ホーム</button>`;
  const tabSpan = `<span class="feature-breadcrumb__current">${tabLabel}</span>`;
  const featureSpan = featureLabel ? `${sep}<span class="feature-breadcrumb__current">${featureLabel}</span>` : '';
  ui.featureBreadcrumb.innerHTML = `${home}${sep}${tabSpan}${featureSpan}`;
}

function applyFeatureGroupClass(root, group) {
  if (!root) return;
  root.classList.remove('feat-vis', 'feat-data', 'feat-change');
  if (group === 'vis') root.classList.add('feat-vis');
  else if (group === 'data') root.classList.add('feat-data');
  else root.classList.add('feat-change');
  // 上部タブバーの「⋯ その他」details を強制 open/close（vis/data 時は中身を横並び表示）
  const moreEl = root.querySelector('.kus-tab-more') as HTMLDetailsElement | null;
  if (moreEl) {
    const wantOpen = (group === 'vis' || group === 'data');
    moreEl.open = wantOpen;
    // タブをクリックすると details が toggle されてしまうので、vis/data の間は close を阻止する
    if (!(moreEl as any).__keepOpenGuardAttached) {
      (moreEl as any).__keepOpenGuardAttached = true;
      moreEl.addEventListener('toggle', () => {
        const stayOpen = root.classList.contains('feat-vis') || root.classList.contains('feat-data');
        if (stayOpen && !moreEl.open) moreEl.open = true;
      });
    }
  }
}

export function showLauncherScreen(options: any = {}) {
  const root = getToolDocument().getElementById('kintone-unified-suite-v2');
  if (!root) return;
  state.activeFeatureKey = '';
  root.classList.remove('screen-feature', 'feat-vis', 'feat-data', 'feat-change');
  root.classList.add('screen-launcher', 'launcher-tabbed', 'launcher-show-advanced');
  if (ui.featureTitle) ui.featureTitle.textContent = '';
  if (ui.featureConn) ui.featureConn.textContent = '';
  if (ui.featureBreadcrumb) ui.featureBreadcrumb.innerHTML = '<span class="feature-breadcrumb__current">ホーム</span><span class="feature-breadcrumb__sep" aria-hidden="true">/</span><span class="feature-breadcrumb__current">機能</span>';
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
  if (html && html !== MAIN_RESULT_PLACEHOLDER_HTML && isRestorableResultHtml(html)) {
    state.lastResultByTab[prevTab] = html;
  }
}

const MAIN_RESULT_PLACEHOLDER_HTML = '<div class="main-result-placeholder"><p class="main-result-placeholder-title">結果エリア</p><p class="main-result-placeholder-body">このタブの操作結果やログがここに表示されます。</p></div>';
const RESTORABLE_RESULT_HTML_MAX = 500_000;

function isRestorableResultHtml(html) {
  const text = String(html || '');
  if (!text || text.length > RESTORABLE_RESULT_HTML_MAX) return false;
  return !/(<script\b|<iframe\b|<object\b|<embed\b|<link\b|<meta\b|\son[a-z]+\s*=|javascript:)/i.test(text);
}

function restoreTabResult(nextKey) {
  if (!ui.result) return;
  if (nextKey === 'diff') return; // diff タブは renderResultRows 側で描画
  const stored = state.lastResultByTab && state.lastResultByTab[nextKey];
  if (typeof stored === 'string' && stored.length && isRestorableResultHtml(stored)) {
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
    // ARIA タブの選択状態と roving tabindex を同期（role="tab" のものだけ）
    if (t.getAttribute('role') === 'tab') {
      t.setAttribute('aria-selected', active ? 'true' : 'false');
      (t as HTMLElement).tabIndex = active ? 0 : -1;
    }
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
  updateChangeWizardCurrentStep();
}

/**
 * 変更作業ウィザード: 5 ステップのうち「次にやること」を `is-primary` で示す。
 * 完了済みステップには `is-done` を付け、戻ってクリックできる目印にする。
 *
 * 進行判定:
 *  01 connection → 比較元/比較先のアプリIDが入力されたら done
 *  02 diff       → 差分比較が一度実行されたら done
 *  03 plan       → 反映プランが確認されたら done
 *  04 apply      → プレビュー反映が完了したら done
 *  05 analyze    → 最終ステップなので done 扱いはしない
 *
 * `is-primary` は最初の未完了ステップに付く。すべて済みなら 05 (影響確認) を指す。
 */
export function updateChangeWizardCurrentStep() {
  const flow = getToolDocument().getElementById('u_launcherFlow');
  if (!flow) return;
  const sourceApp = (ui.sourceApp?.value || '').trim();
  const targetApp = (ui.targetApp?.value || '').trim();
  const connDone = !!sourceApp && !!targetApp;
  const diffDone = Array.isArray(state.lastDiffRows) && state.lastDiffRows.length > 0;
  const planDone = !!state.lastApplyPlan;
  const applyDone = !!state.lastApplyCompletedAt;
  const doneByStep: Record<string, boolean> = {
    connection: connDone,
    diff: diffDone,
    plan: planDone,
    apply: applyDone,
    analyze: false
  };
  const order = ['connection', 'diff', 'plan', 'apply', 'analyze'];
  let current = order.find((key) => !doneByStep[key]) || 'analyze';
  flow.querySelectorAll<HTMLElement>('.launcher-flow-step').forEach((step) => {
    const key = step.dataset.wizardStep || '';
    step.classList.toggle('is-primary', key === current);
    step.classList.toggle('is-done', !!doneByStep[key]);
    step.setAttribute('aria-current', key === current ? 'step' : 'false');
  });
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
  const reflectScopeKeys = deps.selectedScopeKeys?.(ui.applyScopes) || [];
  if (reflectSummary) {
    const extraText = isReflectNodeModeEffective()
      ? '差分を選んで反映モード中'
      : (ui.applyDiffOnly?.checked ? '差分ありセクションのみ反映' : '');
    reflectSummary.innerHTML = scopeSummaryLabel(
      SECTION_DEFS.filter((def) => def.put),
      reflectScopeKeys,
      { emptyText: '反映対象がまだ選ばれていません', extraText }
    );
  }
  const reflectCountBadge = getToolDocument().getElementById('u_reflectScopeCountBadge');
  if (reflectCountBadge) {
    const total = SECTION_DEFS.filter((def) => def.put).length;
    const sel = reflectScopeKeys.length;
    reflectCountBadge.textContent = `${sel} / ${total}`;
    reflectCountBadge.classList.toggle('is-empty', sel === 0);
    reflectCountBadge.classList.toggle('is-full', sel > 0 && sel === total);
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
  renderDefaultIgnoreChips();
  const tags = getToolDocument().getElementById('u_ignoreKeysTags');
  if (!tags) {
    renderDiffSuggestionChips();
    renderIgnoreImpactPreview();
    refreshIgnorePresetDropdown();
    return;
  }
  const val = ui.ignoreKeys.value || '';
  const keys = val.split(',').map((k) => k.trim()).filter(Boolean);
  if (keys.length === 0) {
    tags.innerHTML = '<span style="color:#94a3b8;font-size:11px;padding:2px 0">追加の無視キーなし（上のデフォルトキーは常に除外）</span>';
  } else {
    tags.innerHTML = keys.map((k) => {
      const isPath = k.includes('.') || k.includes('[');
      const isWildcard = k.includes('*');
      const kindLabel = isPath ? 'パス' : (isWildcard ? 'パターン' : 'キー');
      const kindTitle = isPath
        ? 'JSONパス完全一致で無視'
        : (isWildcard ? '* を含むパターン（例: *At, *Id）' : 'キー名一致で無視（どこに現れても）');
      return `<span class="chip" style="user-select:none" title="${esc(kindTitle)}"><span style="opacity:.55;font-size:10px;margin-right:2px">${esc(kindLabel)}</span>${esc(k)}<button type="button" style="border:none;background:none;cursor:pointer;padding:0 0 0 4px;font-size:12px;color:#64748b;line-height:1" data-act="removeIgnoreKey" data-key="${esc(k)}">×</button></span>`;
    }).join('');
  }
  renderDiffSuggestionChips();
  renderIgnoreImpactPreview();
  refreshIgnorePresetDropdown();
}

export function renderDefaultIgnoreChips() {
  const host = ui.ignoreDefaultChips || getToolDocument().getElementById('u_ignoreDefaultChips');
  if (!host) return;
  const items = [...DEFAULT_IGNORE_KEYS];
  host.innerHTML =
    '<span class="diff-static-chip-lbl" title="ツール側で常に差分計算から外すメタ系キー">常時除外</span>' +
    items.map((k) => `<span class="chip diff-static-chip" title="常に除外（DEFAULT_IGNORE_KEYS）">${esc(k)}</span>`).join('');
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
  ui.diffSuggestedIgnore.innerHTML = state.diffIgnoreSuggestions.map((item: any) => {
    const tooltipLines = [
      `${item.key}: 出現 ${item.count} 件 / ${item.sectionCount} セクション`,
      item.topSectionLabel ? `主なセクション: ${item.topSectionLabel}` : '',
      item.samplePath ? `代表パス: ${item.samplePath}` : '',
      item.sampleLeft ? `比較元の例: ${item.sampleLeft}` : '',
      item.sampleRight ? `比較先の例: ${item.sampleRight}` : ''
    ].filter(Boolean).join('\n');
    const sectionTag = item.topSectionLabel
      ? `<span style="opacity:.7;font-size:10px;margin-left:4px">${esc(item.topSectionLabel)}</span>`
      : '';
    return `<button type="button" class="btn sub" data-act="addSuggestedIgnore" data-key="${esc(item.key)}" style="font-size:11px;padding:4px 8px" title="${esc(tooltipLines)}">＋${esc(item.key)} <span style="opacity:.8">(${item.count})</span>${sectionTag}</button>`;
  }).join('');
}

export function renderIgnoreImpactPreview() {
  const host = ui.ignoreImpactPreview || getToolDocument().getElementById('u_ignoreImpactPreview');
  if (!host) return;
  if (!state.lastDiffRows || !state.lastDiffRows.length) {
    host.textContent = '差分比較を実行すると、現在の無視キー設定で何件除外されるかをここに表示します。';
    return;
  }
  const impact = previewIgnoreKeyImpact(state.lastDiffRows, ui.ignoreKeys.value);
  if (!impact.total) {
    host.textContent = '対象となる差分行がありません。';
    return;
  }
  if (!impact.wouldRemove) {
    host.textContent = `現在の無視キー設定で次回比較しても、差分 ${impact.total} 件は変わりません（追加の除外なし）。`;
    return;
  }
  const remaining = impact.total - impact.wouldRemove;
  host.textContent = `現在の無視キー設定で再実行すると、差分 ${impact.total} 件 → 約 ${remaining} 件になります（${impact.wouldRemove} 件が新たに除外）。`;
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
    ui.diffSelectionState.textContent = '⏳ まだ差分を実行していません';
    ui.diffSelectionState.classList.add('is-empty-state');
    return;
  }
  ui.diffSelectionState.classList.remove('is-empty-state');
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
  // 短い1行サマリ + title 属性に詳細
  const describeBundle = (label, bundle, importedName, imported) => {
    if (!bundle) return { short: `${label}: 未取得`, full: `${label}: 未取得` };
    const previewText = getPreviewStateLabel(bundle.preview);
    const revisionText = resolveBundleRevision(bundle) || '-';
    const guestText = bundle.guestId ? `ゲスト ${bundle.guestId}` : '通常空間';
    const appId = bundle.appId || '-';
    if (imported) {
      const short = `${label}: 📄${importedName || appId} (${previewText}/rev${revisionText})`;
      const full = `${label}: 保存済みJSONを読込 (${importedName || appId}) [${previewText} / rev ${revisionText} / ${guestText}]`;
      return { short, full };
    }
    const short = `${label}: アプリ${appId} (${previewText}/rev${revisionText})`;
    const full = `${label}: API取得済み(アプリ ${appId} / ${previewText} / rev ${revisionText} / ${guestText} / ${fmtFetchTime(bundle.fetchedAt)})`;
    return { short, full };
  };
  const src = describeBundle('比較元', state.importedSourceBundle || state.lastSourceBundle, state.importedSourceName, !!state.importedSourceBundle);
  const tgt = describeBundle('比較先', state.importedTargetBundle || state.lastTargetBundle, state.importedTargetName, !!state.importedTargetBundle);
  ui.bundleState.textContent = `${src.short} → ${tgt.short}`;
  ui.bundleState.setAttribute('title', `${src.full}\n${tgt.full}`);
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
    ui.commonDataState.textContent = `${src.short} / ${tgt.short} / ${diffInfo}`;
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
  const checklistKeys = ['diff', 'plan', 'preview', 'target'];
  const checklistTotal = checklistKeys.length;
  const checklistDone = checklistKeys.filter((key) => !!checklist[key]).length;
  const targetCountLabel = isNode ? '選んだ差分' : '選んだセクション';
  const targetCountValue = isNode ? selectedNodeRows.length : scopeInfo.effectiveScopes.length;
  const nonFieldScopes = scopeInfo.effectiveScopes.filter((key) => key && key !== 'fieldSettings');
  const firstNonFieldScope = nonFieldScopes[0] || '';
  const checklistComplete = checklistDone === checklistTotal;
  const safetyLabel = (checklistComplete && backupReady && stopOnError) ? '準備OK' : '要見直し';
  const warnings: string[] = [];
  if (!diffReady) warnings.push('差分比較がまだ最新ではありません。「差分比較」または「差分比較して候補作成」から最新化してください。');
  if (!scopeInfo.baseScopes.length && !isNode) warnings.push('「反映セクションを選ぶ」から、今回まとめて反映するセクションを選んでください。');
  if (scopeInfo.warning) warnings.push(scopeInfo.warning);
  if (isNode && !state.reflectRows.length) warnings.push('差分を選んで反映モードです。まず「差分比較して候補作成」で候補を出してください。');
  if (!checklistComplete) warnings.push('画面下の反映前チェックを完了してください。');
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
    { no: 4, title: 'プレビュー反映', meta: checklistComplete ? 'チェック完了' : `チェック ${checklistDone}/${checklistTotal}`, done: checklistComplete && planReady }
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

  // V2: 高重要度の差分が含まれる場合の赤帯バナー
  const highRiskRows = targetRows.filter((row) => row && row.severity === 'high' && row.type !== 'same');
  const highRiskCount = highRiskRows.length;
  const highBreakdown = (() => {
    const breakdown: Record<string, number> = {};
    highRiskRows.forEach((row) => {
      const key = String(row.sectionKey || '');
      breakdown[key] = (breakdown[key] || 0) + 1;
    });
    return Object.entries(breakdown).slice(0, 4).map(([key, n]) => {
      const label = SECTION_DEFS.find((d) => d.key === key)?.label || key;
      return `${esc(label)} ${n}`;
    }).join(' / ');
  })();
  const dangerBanner = highRiskCount > 0
    ? `<div class="reflect-danger-banner" role="alert">
        <span class="reflect-danger-banner__icon" aria-hidden="true">!</span>
        <div class="reflect-danger-banner__copy">
          <div class="reflect-danger-banner__title">高重要度の変更 ${highRiskCount}件 が含まれています</div>
          <div class="reflect-danger-banner__sub">${highBreakdown || '権限の弱化・フィールド削除・状態削除など、影響の大きな変更です'}</div>
        </div>
      </div>`
    : '';

  // V1: 1 ステータス行 + 次のアクション 1 つ + 折りたたみ詳細
  const stepNo = !diffReady ? 1 : (!targetCountValue ? 2 : (!planReady ? 3 : 4));
  const stepLabels = ['差分を作る', '対象を選ぶ', 'プラン確認', 'プレビュー反映'];
  const stepTitle = stepLabels[stepNo - 1];
  const progressBar = `<div class="reflect-mini-progress" aria-label="進行ステップ"><div class="reflect-mini-progress__bar" style="width:${(stepNo - 1) * 33.3}%"></div>${[1, 2, 3, 4].map((n) => `<span class="reflect-mini-progress__dot${n < stepNo ? ' is-done' : ''}${n === stepNo ? ' is-current' : ''}" title="${esc(stepLabels[n - 1])}"></span>`).join('')}</div>`;

  // S4: 数字主役チップ
  const statChips = `<div class="stat-chip-row" role="group" aria-label="状況サマリー">
    <div class="stat-chip ${actualDiffRows.length ? 'stat-chip--accent' : ''}" title="${diffReady ? '最新差分件数' : '差分は未作成または再計算が必要です'}">
      <div class="stat-chip__num">${diffReady ? actualDiffRows.length : '—'}</div>
      <div class="stat-chip__label">差分</div>
    </div>
    <div class="stat-chip ${targetCountValue ? 'stat-chip--accent' : ''}" title="反映する対象の件数">
      <div class="stat-chip__num">${targetCountValue}</div>
      <div class="stat-chip__label">${esc(targetCountLabel)}</div>
    </div>
    <div class="stat-chip ${sev.high > 0 ? 'stat-chip--danger' : ''}" title="高重要度の差分">
      <div class="stat-chip__num">${sev.high}</div>
      <div class="stat-chip__label">高</div>
    </div>
    <div class="stat-chip ${sev.medium > 0 ? 'stat-chip--warn' : ''}" title="中重要度の差分">
      <div class="stat-chip__num">${sev.medium}</div>
      <div class="stat-chip__label">中</div>
    </div>
    <div class="stat-chip" title="低重要度の差分">
      <div class="stat-chip__num">${sev.low}</div>
      <div class="stat-chip__label">低</div>
    </div>
    <div class="stat-chip ${checklistComplete ? 'stat-chip--ok' : 'stat-chip--warn'}" title="反映前チェックリスト">
      <div class="stat-chip__num">${checklistDone}<span style="font-size:11px;color:var(--txt-3)">/${checklistTotal}</span></div>
      <div class="stat-chip__label">安全</div>
    </div>
    <div class="stat-chip ${planReady ? 'stat-chip--ok' : ''}" title="${planReady ? '最新条件と一致' : 'まだ未確認'}">
      <div class="stat-chip__num">${planReady ? '✓' : '—'}</div>
      <div class="stat-chip__label">プラン</div>
    </div>
  </div>`;

  // S2: セクション分布バー（差分件数）
  const distHtml = (() => {
    if (!diffReady || !targetRows.length) return '';
    const SECTION_PALETTE: Record<string, string> = {
      fieldSettings: '#3b82f6',
      layoutSettings: '#6366f1',
      formSettings: '#0ea5e9',
      viewSettings: '#f59e0b',
      reportSettings: '#ec4899',
      processSettings: '#06b6d4',
      actionSettings: '#10b981',
      pluginSettings: '#a855f7',
      customizeSettings: '#1e293b',
      appAcl: '#dc2626',
      fieldAcl: '#ef4444',
      recordPermissions: '#f97316',
      notifications: '#fb923c',
      perRecordNotifications: '#fb923c',
      reminderNotifications: '#fdba74',
      categories: '#94a3b8',
      appSettings: '#64748b',
      appInfo: '#94a3b8'
    };
    const counts = new Map<string, number>();
    for (const row of targetRows) {
      const k = String(row?.sectionKey || '');
      if (!k) continue;
      counts.set(k, (counts.get(k) || 0) + 1);
    }
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    if (!sorted.length) return '';
    const total = sorted.reduce((acc, [, n]) => acc + n, 0);
    const filterSec = ui.diffFilterSection?.value || state.diffFilterSection || '';
    const segs = sorted.map(([k, n]) => {
      const lbl = SECTION_DEFS.find((d) => d.key === k)?.label || k;
      const color = SECTION_PALETTE[k] || '#475569';
      const flex = Math.max(1, n);
      const active = filterSec === k ? ' is-active' : '';
      return `<button type="button" class="sec-dist__seg${active}" data-act="filterDiffBySectionFromDist" data-section="${esc(k)}" style="flex:${flex};background:${color}" title="${esc(lbl)} ${n}件 (クリックで差分一覧をこのセクションで絞り込み)">${n >= 3 ? n : ''}</button>`;
    }).join('');
    const legend = sorted.slice(0, 6).map(([k, n]) => {
      const lbl = SECTION_DEFS.find((d) => d.key === k)?.label || k;
      const color = SECTION_PALETTE[k] || '#475569';
      return `<span class="sec-dist__legend-item"><span class="sec-dist__legend-swatch" style="background:${color}"></span>${esc(lbl)} ${n}</span>`;
    }).join('');
    return `<section class="sec-dist" aria-label="セクション分布">
      <div class="sec-dist__head">
        <span class="sec-dist__title">セクション分布</span>
        <span class="sec-dist__total">全 ${total} 件</span>
      </div>
      <div class="sec-dist__bar">${segs}</div>
      <div class="sec-dist__legend">${legend}${sorted.length > 6 ? `<span class="sec-dist__legend-item">他 ${sorted.length - 6}</span>` : ''}</div>
    </section>`;
  })();

  const detailButtons = [
    routeSwitchActions,
    targetAdjustActions,
    planAction,
    '<button class="btn sub" data-act="runDiffAndPlan" title="差分比較とプラン確認をまとめて実行">差分比較してプラン</button>',
    '<button class="btn sub" data-act="runPreviewProdDiff" title="比較先プレビューと本番の差分を確認">プレビュー⇔本番を比較</button>',
    '<button class="btn sub" data-act="backupTargetPreview" title="今の比較先プレビューをJSON保存">今の比較先を保存</button>',
    '<button class="btn sub" data-act="importTargetPreviewBackupFile" title="保存したバックアップJSONを読み込む">保存済みJSONを読込</button>',
    '<button class="btn sub" data-act="markReflectTargetConfirmed" title="チェックリスト「反映先=プレビュー」を済にする">反映先を確認済みにする</button>'
  ].filter(Boolean).join('');

  // 単一最重要メッセージ
  const headlineMsg = warnings[0] || '次のアクションへ進めます';

  return `<div class="reflect-assist reflect-assist--compact">
    ${dangerBanner}
    <section class="reflect-headline" data-step="${stepNo}">
      <div class="reflect-headline__top">
        <div class="reflect-headline__step">STEP ${stepNo}/4</div>
        <div class="reflect-headline__title">${esc(stepTitle)}</div>
        <div class="reflect-headline__meta">${esc(routeLabel)} ／ ${esc(selectionMeta || '未選択')}</div>
      </div>
      ${progressBar}
      <div class="reflect-headline__action-row">
        <div class="reflect-headline__action">${nextAction}</div>
      </div>
      ${statChips}
      <div class="reflect-headline__hint ${warnings.length ? 'is-warn' : 'is-ok'}">${esc(headlineMsg)}</div>
    </section>
    ${distHtml}
    <details class="reflect-detail-fold" open>
      <summary>
        <span>その他の操作・詳細</span>
        <small>ルート切替 / 対象調整 / 個別確認 / バックアップ / 残り警告</small>
      </summary>
      <div class="reflect-detail-fold__body">
        <div class="reflect-detail-fold__buttons">${detailButtons}</div>
        ${warnings.length > 1 ? `<ul class="reflect-detail-fold__warns">${warnings.slice(1).map((msg) => `<li>${esc(msg)}</li>`).join('')}</ul>` : ''}
        ${backupState ? `<div class="reflect-good">${esc(backupState)}${state.lastPreviewBackupPayload ? ' / 必要なら「直前保存を戻す」で元に戻せます。' : ''}</div>` : ''}
        <div class="reflect-detail-fold__small">
          反映前チェック ${checklistDone}/${checklistTotal} ／ バックアップ ${backupReady ? 'ON' : 'OFF'} ／ エラー時 ${stopOnError ? '中断' : '継続'}
          ${planReady ? `／ プラン: ${esc(planTime)}` : ''}
        </div>
      </div>
    </details>
  </div>`;
}

/**
 * 予定リクエスト一覧を画面で確認できるようにする HTML 片を返す。
 * ドライランと同じ plannedRequests を、ファイル保存せずインラインで参照できる。
 * Method/Path/note を行で並べ、body は <details> で展開すると JSON が見える。
 */
function buildPlannedRequestsListHtml(plannedRequests: any): string {
  const list = Array.isArray(plannedRequests) ? plannedRequests : [];
  if (!list.length) return '';
  const methodColor = (m: string) => {
    const v = String(m || '').toUpperCase();
    if (v === 'POST') return '#15803d';
    if (v === 'PUT') return '#1d4ed8';
    if (v === 'DELETE') return '#b91c1c';
    return '#475569';
  };
  const rows = list.map((req, idx) => {
    const method = String(req?.method || '?').toUpperCase();
    const path = String(req?.path || '');
    const note = req?.note ? `<span style="color:#64748b;font-size:11px"> (${esc(String(req.note))})</span>` : '';
    const sectionLabel = req?.sectionLabel || req?.sectionKey || '';
    let bodyJson = '';
    try { bodyJson = JSON.stringify(req?.body ?? {}, null, 2); } catch { bodyJson = String(req?.body ?? ''); }
    const bodyTrunc = bodyJson.length > 8000 ? bodyJson.slice(0, 8000) + '\n…(省略)' : bodyJson;
    return `<details class="planned-request-row">
      <summary>
        <span style="color:#64748b;width:24px;text-align:right">#${idx + 1}</span>
        <span style="font-weight:700;color:${methodColor(method)};min-width:54px">${esc(method)}</span>
        <code>${esc(path)}</code>
        ${sectionLabel ? `<span style="font-size:10px;color:#64748b;margin-left:auto;background:#f1f5f9;padding:1px 6px;border-radius:4px">${esc(String(sectionLabel))}</span>` : ''}
      </summary>
      <div style="padding:6px 10px;background:#f8fafc">
        ${note ? `<div style="font-size:11px;color:#475569;margin-bottom:4px">${note}</div>` : ''}
        <pre>${esc(bodyTrunc)}</pre>
      </div>
    </details>`;
  }).join('');
  return `<details class="reflect-planned-requests">
    <summary>予定リクエスト一覧 (${list.length} 件) — クリックで詳細展開</summary>
    <div>${rows}</div>
  </details>`;
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
    <pre class="reflect-plan-inline__pre">${esc(head)}${esc(more)}</pre>
    ${buildPlannedRequestsListHtml(plan.plannedRequests)}`;
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

// S7: layoutSettings 用のヒートマップ HTML を生成
function buildLayoutHeatmapHtml(beforeLayout: any, afterLayout: any): string {
  const before = Array.isArray(beforeLayout?.layout) ? beforeLayout.layout : Array.isArray(beforeLayout) ? beforeLayout : [];
  const after = Array.isArray(afterLayout?.layout) ? afterLayout.layout : Array.isArray(afterLayout) ? afterLayout : [];
  if (!before.length && !after.length) return '';
  const sigOf = (item: any) => {
    try { return JSON.stringify({ type: item?.type, code: item?.code, fields: (item?.fields || []).map((f: any) => f?.code) }); }
    catch { return ''; }
  };
  const beforeSigs = new Set(before.map(sigOf));
  const afterSigs = new Set(after.map(sigOf));
  const cells: string[] = [];
  const flatten = (rows: any[], side: 'before' | 'after' | 'both') => {
    rows.forEach((row, idx) => {
      if (!row || typeof row !== 'object') return;
      const fields = Array.isArray(row.fields) ? row.fields : [];
      const t = String(row.type || 'ROW').toUpperCase();
      const rowSig = sigOf(row);
      const inBefore = beforeSigs.has(rowSig);
      const inAfter = afterSigs.has(rowSig);
      let changed = 0;
      if (side === 'before' && !inAfter) changed = 1; // 削除
      else if (side === 'after' && !inBefore) changed = 1; // 追加
      else if (inBefore && inAfter) changed = 0; // 同一
      else changed = 2; // 部分変更
      if (t === 'GROUP' || t === 'SUBTABLE') {
        const code = String(row.code || '');
        cells.push(`<div class="layout-heatmap__cell" data-changed="${changed}" title="${esc(t)}: ${esc(code)}">${esc(t === 'SUBTABLE' ? '⊞' : '▦')} ${esc(code || `#${idx}`)}</div>`);
      } else {
        fields.forEach((f: any) => {
          const code = String(f?.code || f?.elementId || '');
          if (!code) return;
          const cellChanged = changed;
          cells.push(`<div class="layout-heatmap__cell" data-changed="${cellChanged}" title="${esc(code)}">${esc(code)}</div>`);
        });
      }
    });
  };
  // After 側を主に表示しつつ、before のみは削除セルとして含める
  flatten(after, 'after');
  // before のみのセル
  before.forEach((row: any, idx: number) => {
    const sig = sigOf(row);
    if (afterSigs.has(sig)) return;
    const fields = Array.isArray(row?.fields) ? row.fields : [];
    fields.forEach((f: any) => {
      const code = String(f?.code || '');
      if (!code) return;
      cells.push(`<div class="layout-heatmap__cell" data-changed="1" title="削除: ${esc(code)}" style="opacity:.55">−${esc(code)}</div>`);
    });
  });
  if (!cells.length) return '';
  return `<div class="layout-heatmap" aria-label="レイアウトヒートマップ">${cells.join('')}</div>`;
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
      return `<details class="reflect-preview-card"><summary>${renderSectionIconHtml(secKey)}<span class="reflect-preview-card__label">${label}</span>${counter}<span class="reflect-preview-card__muted">変更なし</span></summary></details>`;
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
    return `<details class="reflect-preview-card"><summary>${renderSectionIconHtml(secKey)}<span class="reflect-preview-card__label">${label}</span>${counter}</summary>
      <div class="reflect-preview-card__body">
        ${added}${updated}${removed}${truncated}
      </div>
    </details>`;
  }
  if (shape === 'items' && info.itemized) {
    const it = info.itemized;
    const counter = `<span class="reflect-preview-counter reflect-preview-counter--add">追加 ${it.addedCount}</span>` +
      `<span class="reflect-preview-counter reflect-preview-counter--upd">更新 ${it.updatedCount}</span>` +
      `<span class="reflect-preview-counter reflect-preview-counter--rm">削除 ${it.removedCount}</span>`;
    if (!it.totalCount && !(it.notes && it.notes.length)) {
      return `<details class="reflect-preview-card"><summary>${renderSectionIconHtml(secKey)}<span class="reflect-preview-card__label">${label}</span>${counter}<span class="reflect-preview-card__muted">変更なし</span></summary></details>`;
    }
    const STATUS_CLASS: Record<string, string> = { added: 'add', updated: 'upd', removed: 'rm' };
    const STATUS_LABEL: Record<string, string> = { added: '追加', updated: '更新', removed: '削除' };
    const itemRows = (it.items || []).map((item: any) => {
      const cls = STATUS_CLASS[item.status] || 'upd';
      const lab = STATUS_LABEL[item.status] || item.status;
      const beforeAfter = item.status === 'updated'
        ? `<div class="reflect-preview-row__grid">
            <div class="reflect-preview-col"><div class="reflect-preview-col__label">変更前</div><pre class="reflect-preview-col__pre">${esc(item.beforeText ?? '(なし)')}</pre></div>
            <div class="reflect-preview-col"><div class="reflect-preview-col__label">変更後</div><pre class="reflect-preview-col__pre">${esc(item.afterText ?? '(なし)')}</pre></div>
          </div>`
        : `<pre class="reflect-preview-row__pre">${esc(item.afterText ?? item.beforeText ?? '')}</pre>`;
      return `<div class="reflect-preview-row reflect-preview-row--${cls}">
        <div class="reflect-preview-row__key"><span class="reflect-preview-row__badge reflect-preview-row__badge--${cls}">${lab}</span> ${esc(item.label || item.key)}</div>
        ${beforeAfter}
      </div>`;
    }).join('');
    const truncated = it.truncated ? `<div class="reflect-preview-card__muted">…一部省略（全${it.totalCount}件のうち先頭のみ表示）</div>` : '';
    const notesHtml = (it.notes && it.notes.length)
      ? `<div class="reflect-preview-card__notes">${(it.notes as string[]).map((n) => `<div class="reflect-preview-card__note">${esc(n)}</div>`).join('')}</div>`
      : '';
    return `<details class="reflect-preview-card"><summary>${renderSectionIconHtml(secKey)}<span class="reflect-preview-card__label">${label}</span>${counter}</summary>
      <div class="reflect-preview-card__body">
        ${notesHtml}
        ${itemRows}${truncated}
      </div>
    </details>`;
  }
  if (shape === 'whole' && info.wholePreview) {
    const w = info.wholePreview;
    if (!w.changed) {
      return `<details class="reflect-preview-card"><summary>${renderSectionIconHtml(secKey)}<span class="reflect-preview-card__label">${label}</span><span class="reflect-preview-card__muted">変更なし</span></summary></details>`;
    }
    // S7: layoutSettings ならヒートマップを併用
    let heatmapHtml = '';
    if (secKey === 'layoutSettings') {
      try {
        const before = JSON.parse(w.beforeText || '{}');
        const after = JSON.parse(w.afterText || '{}');
        heatmapHtml = buildLayoutHeatmapHtml(before, after);
      } catch { /* parse 失敗時は省略 */ }
    }
    // S8: Before/After スライダー風 2 列レイアウト
    return `<details class="reflect-preview-card sev-medium"><summary>${renderSectionIconHtml(secKey)}<span class="reflect-preview-card__label">${label}</span><span class="reflect-preview-counter reflect-preview-counter--upd">セクション全体更新</span></summary>
      <div class="reflect-preview-card__body">
        ${heatmapHtml}
        <div class="ba-slider">
          <div class="ba-slider__col ba-slider__col--before"><h5>変更前</h5><pre class="ba-slider__pre">${esc(w.beforeText)}</pre></div>
          <div class="ba-slider__col ba-slider__col--after"><h5>変更後</h5><pre class="ba-slider__pre">${esc(w.afterText)}</pre></div>
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
    if (info?.shape === 'items') return (info.itemized?.totalCount || 0) > 0 || (info.itemized?.notes?.length || 0) > 0;
    if (info?.shape === 'whole') return !!info.wholePreview?.changed;
    return false;
  });
  const totalChanges = changedEntries.reduce((acc, [, info]) => {
    if (info?.shape === 'map') return acc + (info.preview?.totalCount || 0);
    if (info?.shape === 'items') return acc + (info.itemized?.totalCount || 0);
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
        if (info?.shape === 'items') return (info.itemized?.totalCount || 0) > 0 || (info.itemized?.notes?.length || 0) > 0;
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

// S12: 反映タブのミニマップナビ（差分セクションを縦の点で可視化）
export function renderReflectMinimapNav() {
  const id = 'u_reflectMinimapNav';
  const doc = getToolDocument();
  let host = doc.getElementById(id);
  const isReflect = state.activeTab === 'reflect';
  if (!isReflect) {
    if (host) host.remove();
    return;
  }
  const layout = doc.getElementById('u_reflectLayout');
  if (!layout) return;
  if (!host) {
    host = doc.createElement('div');
    host.id = id;
    host.className = 'minimap-nav';
    host.setAttribute('role', 'navigation');
    host.setAttribute('aria-label', '差分セクションへジャンプ');
    layout.parentElement?.appendChild(host);
  }
  const counts = new Map<string, { total: number; high: number; medium: number }>();
  const rows = getActualDiffRows(state.lastDiffRows || []);
  for (const r of rows) {
    const k = String(r.sectionKey || '');
    if (!k) continue;
    const slot = counts.get(k) || { total: 0, high: 0, medium: 0 };
    slot.total += 1;
    const tone = severityToneOf(r.severity);
    if (tone === 'high') slot.high += 1;
    else if (tone === 'medium') slot.medium += 1;
    counts.set(k, slot);
  }
  if (!counts.size) {
    host.innerHTML = '';
    host.style.display = 'none';
    return;
  }
  host.style.display = 'flex';
  const filterSec = ui.diffFilterSection?.value || state.diffFilterSection || '';
  host.innerHTML = SECTION_DEFS
    .filter((d) => counts.has(d.key))
    .map((d) => {
      const slot = counts.get(d.key)!;
      const cls = slot.high > 0 ? 'has-diff' : slot.medium > 0 ? 'has-diff-mid' : 'has-diff-low';
      const active = filterSec === d.key ? ' is-current' : '';
      return `<button type="button" class="minimap-nav__dot ${cls}${active}" data-act="filterDiffBySectionFromDist" data-section="${esc(d.key)}" title="${esc(d.label)}: ${slot.total}件 (高 ${slot.high} / 中 ${slot.medium})"></button>`;
    }).join('');
}

// U5: 比較先アプリの常駐バッジ（事故防止）
export function renderReflectTargetBadge() {
  const el = getToolDocument().getElementById('u_reflectTargetBadge');
  if (!el) return;
  let appId = '';
  let isPreview = true;
  let guestId = '';
  try {
    const c = deps.commonParams();
    appId = String(c.target?.appId || '').trim();
    isPreview = !!c.target?.preview;
    guestId = String(c.target?.guestId || '').trim();
  } catch { /* ignore */ }
  const targetBundle = state.importedTargetBundle || state.lastTargetBundle;
  const appLabel = (() => {
    const info = targetBundle?.sections?.appInfo;
    if (info && typeof info === 'object' && !info._fetchError) {
      return String(info.name || '').trim();
    }
    return '';
  })();
  const previewLabel = isPreview ? 'プレビュー' : '本番';
  const previewClass = isPreview ? 'is-preview' : 'is-prod';
  const guestSuffix = guestId ? ` / ゲスト${esc(guestId)}` : '';
  const appPath = guestId ? `/k/guest/${encodeURIComponent(guestId)}/${encodeURIComponent(appId)}/` : `/k/${encodeURIComponent(appId)}/`;
  if (!appId) {
    el.innerHTML = `<div class="reflect-target-badge__inner" data-state="empty">
      <span class="reflect-target-badge__label">反映先未設定</span>
    </div>`;
    return;
  }
  // プレビュー画面をまだ開いていない場合は「開く」ボタンを強調して、
  // チェックリスト「プレビュー画面確認済み」を満たすための導線を分かりやすくする。
  const previewKey = `${appId}::${guestId}`;
  const previewOpened = !!state.reflectPreviewOpened && state.reflectPreviewOpenedFor === previewKey;
  const pendingClass = previewOpened ? '' : ' reflect-target-badge__open--pending';
  const pendingLabel = previewOpened ? '開く' : '画面を開く ▸';
  el.innerHTML = `<div class="reflect-target-badge__inner ${previewClass}">
    <span class="reflect-target-badge__chip">${esc(previewLabel)}</span>
    <span class="reflect-target-badge__app">App ${esc(appId)}</span>
    ${appLabel ? `<span class="reflect-target-badge__name" title="${esc(appLabel)}">${esc(appLabel)}</span>` : ''}
    ${guestSuffix ? `<span class="reflect-target-badge__guest">${guestSuffix}</span>` : ''}
    <button type="button" class="reflect-target-badge__open${pendingClass}" data-act="openTargetPreviewApp" data-preview-url="${esc(appPath)}" title="比較先アプリのプレビュー確認画面を開き、チェックリスト「プレビュー画面確認済み」を満たします">${esc(pendingLabel)}</button>
  </div>`;
}

// U1: 状態に応じた「次の一手」ボタンをフッターに常駐
export interface ReflectNextActionInfo {
  act: string;
  label: string;
  hint: string;
  disabled: boolean;
}

export function getReflectNextAction(): ReflectNextActionInfo {
  const isNode = isReflectNodeModeEffective();
  const diffReady = !!state.lastDiffAt && state.lastDiffSignature === deps.currentDiffSignature();
  const actualDiffRows = getActualDiffRows(state.lastDiffRows || []);
  const scopeInfo = getEffectiveReflectScopeInfo();
  const selectedNodeRows = deps.getSelectedReflectRows ? deps.getSelectedReflectRows() : [];
  const targetCount = isNode ? selectedNodeRows.length : scopeInfo.effectiveScopes.length;
  const planSig = getCurrentReflectPlanSignature();
  const plan = state.lastApplyPlan;
  const planReady = !!(plan && planSig && plan.signature === planSig);
  const checklist = state.reflectApplyChecklist || ({} as any);
  const checklistKeys = ['diff', 'plan', 'preview', 'target'];
  const checklistDone = checklistKeys.filter((k) => !!checklist[k]).length;
  const checklistTotal = checklistKeys.length;

  if (!diffReady) {
    return {
      act: isNode ? 'runDiffLoadReflectNodes' : 'runDiff',
      label: isNode ? '差分比較して候補作成' : '差分比較を実行',
      hint: '最新の差分を取得します',
      disabled: false
    };
  }
  if (!actualDiffRows.length) {
    return { act: '', label: '反映する差分がありません', hint: '0件のため反映は不要', disabled: true };
  }
  if (!targetCount) {
    return isNode
      ? (state.reflectRows.length
          ? { act: 'selectVisibleReflectNodes', label: '表示中の差分を選択', hint: '候補から選びましょう', disabled: false }
          : { act: 'loadReflectNodes', label: '差分候補を読み込む', hint: '差分から候補を生成', disabled: false })
      : { act: 'applyScopeDiffOnly', label: '差分があるセクションだけ選ぶ', hint: 'ワンクリックで自動選択', disabled: false };
  }
  if (!planReady) {
    return { act: 'previewApplyPlan', label: '実行前プラン確認', hint: 'APIリクエスト内容を確認', disabled: false };
  }
  return {
    act: 'applyPreview',
    label: 'プレビューへ反映',
    hint: checklistDone === checklistTotal ? '反映を実行します' : `安全チェック ${checklistDone}/${checklistTotal}`,
    disabled: false
  };
}

export function renderReflectFooterNext() {
  const el = getToolDocument().getElementById('u_reflectFooterNext');
  if (!el) return;
  const info = getReflectNextAction();
  if (!info.act) {
    el.innerHTML = `<div class="reflect-footer-next__pill" data-state="muted" title="${esc(info.hint)}">
      <span class="reflect-footer-next__label">${esc(info.label)}</span>
    </div>`;
    return;
  }
  // S3: ステージごとの色とアイコン
  const stage = classifyStage(info.act) || 'plan';
  const stageIcon = stageIconChar(stage);
  el.innerHTML = `<button type="button" class="btn-stage" data-stage="${esc(stage)}" data-act="${esc(info.act)}" data-reflect-next="1" title="${esc(info.hint)}" ${info.disabled ? 'disabled' : ''}>
    <span class="btn-stage__icon" aria-hidden="true">${esc(stageIcon)}</span>
    <span>次：${esc(info.label)}</span>
    <span class="btn-stage__shortcut" title="Ctrl+Enter">Ctrl+Enter</span>
  </button>`;
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
    // 実行直前の安心感のため、反映可能なら「何件/何セクションを書き込むか」をボタンに明示する
    applyBtn.textContent = buildApplyButtonLabel({
      isNode,
      selectedNodeCount,
      scopeCount,
      canApply
    });
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
  // 旧アシストパネル本体は隠しスロットになったため innerHTML を設定しない
  if (ui.reflectAssist) ui.reflectAssist.innerHTML = '';
  renderReflectHowto();
  renderReflectPlanInline();
  renderReflectPlanPreview();
  renderReflectPostApplyCard();
  renderReflectApplyReport();
  renderReflectApplyHistory();
  renderReflectQuickPresets();
  renderReflectFooterBadges();
  renderReflectFooterNext();
  renderReflectTargetBadge();
  renderReflectMinimapNav();
  renderReflectHeroCard();
  renderReflectRouteSummaries();
  renderReflectFooterLinkBadges();
}

/**
 * 新メイン画面のヒーローカード（次のアクション）を描画します。
 */
export function renderReflectHeroCard() {
  const host = getToolDocument().getElementById('u_reflectHeroCard');
  if (!host) return;
  const info = getReflectNextAction();
  const diffReady = !!state.lastDiffAt && state.lastDiffSignature === deps.currentDiffSignature();
  const isNode = isReflectNodeModeEffective();
  const targetCount = isNode
    ? (deps.getSelectedReflectRows ? deps.getSelectedReflectRows().length : 0)
    : (deps.selectedScopeKeys?.(ui.applyScopes) || []).length;
  const planSig = (typeof deps.makeApplyPlanSignature === 'function') ? '' : '';
  const plan = state.lastApplyPlan;
  const planReady = !!(plan && plan.totalReq);
  // プランの署名と現在の選択署名がずれている場合、ユーザーがプラン作成後に
  // 反映対象を変えた可能性が高い。バナーで「プラン再生成」を促す。
  let planStale = false;
  let planStaleReason = '';
  try {
    const currentSig = getCurrentReflectPlanSignature();
    if (planReady && currentSig && plan?.signature && currentSig !== plan.signature) {
      planStale = true;
      planStaleReason = plan?.mode === 'nodes' ? 'ノード選択/モードが変わったため' : 'セクション選択が変わったため';
    }
  } catch (e) { /* noop */ }
  const checklist = state.reflectApplyChecklist || {};
  const checklistKeys = ['diff', 'plan', 'preview', 'target'];
  const checklistDone = checklistKeys.filter((k) => !!checklist[k]).length;
  const checklistTotal = checklistKeys.length;

  const stepNo = !diffReady ? 1 : !targetCount ? 2 : !planReady ? 3 : 4;
  const stepTitles = ['差分を作る', '反映する内容を決める', 'プラン確認', 'プレビュー反映'];
  const tone = info.disabled ? 'warn' : (stepNo === 4 && checklistDone === checklistTotal) ? 'ok' : (stepNo === 1 ? '' : '');

  const desc = !diffReady
    ? 'まずは差分比較を実行して、反映する変更を取得します。'
    : !targetCount
      ? '標準ルートまたは詳細ルートで、反映するセクション/差分を選びます。'
      : !planReady
        ? 'APIに送信される予定のリクエスト内容を、プラン確認モーダルで見ます。'
        : checklistDone === checklistTotal
          ? 'すべての準備が完了しました。下の赤いボタンから反映を実行できます。'
          : '反映前チェックリストを確認してから反映してください。';

  const actionBtn = info.act
    ? `<button type="button" class="btn" data-act="${esc(info.act)}" data-reflect-next="1" ${info.disabled ? 'disabled' : ''}>
        ▶ ${esc(info.label)}
      </button>`
    : `<span style="opacity:.85;font-size:12px">${esc(info.label || '次のアクションはありません')}</span>`;

  const progress = [1,2,3,4].map((n) => {
    const cls = n < stepNo ? 'is-done' : n === stepNo ? 'is-current' : '';
    return `<span class="reflect-hero-card__progress-step ${cls}"></span>`;
  }).join('');

  host.dataset.tone = planStale ? 'warn' : tone;
  const staleBannerHtml = planStale
    ? `<div class="reflect-hero-card__stale" role="alert">
        <span class="reflect-hero-card__stale-icon" aria-hidden="true">⚠</span>
        <span class="reflect-hero-card__stale-msg">プランが古い可能性: ${esc(planStaleReason)}。実行前に再生成してください。</span>
        <button type="button" class="btn sub reflect-hero-card__stale-btn" data-act="previewApplyPlan" title="プランを再生成してモーダルを開きます">▶ プラン再生成</button>
      </div>`
    : '';
  host.innerHTML = `
    <div class="reflect-hero-card__step">STEP ${stepNo} / 4</div>
    <div class="reflect-hero-card__title">${esc(stepTitles[stepNo - 1])}</div>
    <div class="reflect-hero-card__desc">${esc(desc)}</div>
    ${staleBannerHtml}
    <div class="reflect-hero-card__action">${actionBtn}<span style="font-size:11px;opacity:.85">${esc(info.hint || '')}</span></div>
    <div class="reflect-hero-card__progress" aria-label="進行ステップ">${progress}</div>
  `;
}

/**
 * ルートカードの要約（選択中セクション数 / 候補数 / JSON状態）を描画。
 */
export function renderReflectRouteSummaries() {
  const doc = getToolDocument();
  const scopeSummary = doc.getElementById('u_reflectScopeSummary');
  if (scopeSummary) {
    const scopes = deps.selectedScopeKeys?.(ui.applyScopes) || [];
    scopeSummary.textContent = scopes.length ? `選択中: ${scopes.length} セクション` : '未選択';
  }
  const nodeSummary = doc.getElementById('u_reflectNodeSummary');
  if (nodeSummary) {
    const rows = state.reflectRows || [];
    const sel = (deps.getSelectedReflectRows ? deps.getSelectedReflectRows().length : 0);
    nodeSummary.textContent = rows.length ? `候補 ${rows.length} / 選択 ${sel}` : '候補未読込';
  }
  const jsonSummary = doc.getElementById('u_reflectJsonSummary');
  if (jsonSummary) {
    const payload = state.importedPatchPayload;
    if (payload?.sections) {
      const sectionCount = Object.keys(payload.sections).length;
      jsonSummary.textContent = `読込済: ${sectionCount} セクション`;
    } else {
      jsonSummary.textContent = '未読込';
    }
  }
}

/**
 * フッターリンクのバッジ件数を描画。
 */
export function renderReflectFooterLinkBadges() {
  const doc = getToolDocument();
  const reportBadge = doc.getElementById('u_reflectReportBadge');
  if (reportBadge) {
    const r = state.lastApplyReport;
    if (r) {
      const total = (r.okCount || 0) + (r.ngCount || 0) + (r.skipCount || 0);
      reportBadge.textContent = total ? String(total) : '';
    } else {
      reportBadge.textContent = '';
    }
  }
  const histBadge = doc.getElementById('u_reflectHistoryBadge');
  if (histBadge) {
    const list = Array.isArray(state.reflectApplyHistory) ? state.reflectApplyHistory : [];
    histBadge.textContent = list.length ? String(list.length) : '';
  }
}

/**
 * モーダルを開閉する共通関数。
 */
export function openReflectModal(name: string) {
  const map: Record<string, string> = {
    node: 'u_reflectNodeModal',
    json: 'u_reflectJsonModal',
    plan: 'u_reflectPlanModal',
    history: 'u_reflectHistoryModal',
    report: 'u_reflectReportModal',
    support: 'u_reflectSupportModal',
    fieldEditor: 'u_reflectFieldEditorModal',
    otherEditor: 'u_reflectOtherEditorModal',
  };
  const id = map[name];
  if (!id) return;
  const el = getToolDocument().getElementById(id);
  if (!el) return;
  el.hidden = false;
}

export function closeReflectModal(name: string) {
  const map: Record<string, string> = {
    node: 'u_reflectNodeModal',
    json: 'u_reflectJsonModal',
    plan: 'u_reflectPlanModal',
    history: 'u_reflectHistoryModal',
    report: 'u_reflectReportModal',
    support: 'u_reflectSupportModal',
    fieldEditor: 'u_reflectFieldEditorModal',
    otherEditor: 'u_reflectOtherEditorModal',
  };
  const id = map[name];
  if (!id) return;
  const el = getToolDocument().getElementById(id);
  if (!el) return;
  el.hidden = true;
}

export function closeAllReflectModals() {
  ['node','json','plan','history','report','support','fieldEditor','otherEditor'].forEach(closeReflectModal);
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
        <span>反映履歴（${history.length}件・端末保存）</span>
        <span style="display:inline-flex;gap:6px">
          <button type="button" class="btn sub" data-act="exportApplyHistory" style="padding:2px 8px;font-size:10px" title="反映履歴をJSONファイルとして書き出します">JSON書き出し</button>
          <button type="button" class="btn sub" data-act="clearApplyHistory" style="padding:2px 8px;font-size:10px" title="履歴を消去">クリア</button>
        </span>
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
  // S14: 完了直後（5分以内）かつエラー無しならセレブレーション
  const celebrate = !hadError && minutesAgo < 5;
  host.innerHTML = `<div class="reflect-post-apply ${statusCls}${celebrate ? ' apply-celebrate' : ''}">
    <div class="reflect-post-apply__head">
      <span class="reflect-post-apply__title">${celebrate ? '✨ ' : ''}反映${ageLabel}に完了しました（${esc(modeLabel)} / ${esc(statusLabel)}）</span>
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
  // U4: 一括選択ツールバー
  const renamesCount = rows.filter((r) => !!r.renameCandidate).length;
  const bulkToolbar = `<div class="reflect-node-bulk-toolbar" role="toolbar" aria-label="差分候補の一括選択">
    <span class="reflect-node-bulk-toolbar__label">一括選択：</span>
    <button type="button" class="btn sub" data-act="reflectBulkSelect" data-bulk="all" title="表示中の全候補を選択">全て (${filtered.length})</button>
    <button type="button" class="btn sub" data-act="reflectBulkSelect" data-bulk="high" title="重要度=高 のみ選択">高のみ</button>
    <button type="button" class="btn sub" data-act="reflectBulkSelect" data-bulk="medium" title="重要度 中 以下のみ選択">中以下</button>
    <button type="button" class="btn sub" data-act="reflectBulkSelect" data-bulk="renames" ${renamesCount === 0 ? 'disabled' : ''} title="改名候補のみ選択">改名候補 (${renamesCount})</button>
    <button type="button" class="btn sub" data-act="reflectBulkSelect" data-bulk="invert" title="表示中の選択状態を反転">反転</button>
    <button type="button" class="btn sub" data-act="reflectBulkSelect" data-bulk="clear" title="選択をすべて解除">クリア</button>
  </div>`;
  const header = `${bulkToolbar}<div class="reflect-node-list-summary">
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
    const modeLabel = mode === 'src' ? '比較元を採用' : '比較先を維持（反映しない）';
    const selectedLabel = selected.has(r._id) ? '選択中' : '未選択';
    const isActive = activeRow?._id === r._id;
    // ローリング tabindex: アクティブ行のみ Tab で到達でき、↑↓で行間を移動する
    const cardAria = `${r.section || '-'} / ${typeLabel} / 重要度${getSeverityDisplayLabel(severity)} / ${selectedLabel}`;
    return `<article class="reflect-node-card-item${isActive ? ' is-active' : ''}${selected.has(r._id) ? ' is-selected' : ''}" data-node-open="${esc(r._id)}" data-node-card="1" tabindex="${isActive ? '0' : '-1'}" aria-label="${esc(cardAria)}">
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
        <span class="reflect-node-card-hint">クリック／Enterで詳細</span>
      </div>
    </article>`;
  }).join('');
  ui.reflectNodeList.innerHTML = `${header}<div class="reflect-node-card-list" role="group" aria-label="差分候補リスト（↑↓で移動、Spaceで選択切替、Enterで詳細表示）">${body}</div>${truncatedCount ? `<div class="reflect-node-list-more">他 ${truncatedCount}件は絞り込みで表示できます</div>` : ''}`;
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
      <span class="reflect-node-badge">${mode === 'src' ? '比較元を採用' : '比較先を維持'}</span>
    </div>
    <div class="reflect-node-actions">
      <button class="btn ${selected ? 'sub' : 'ok'}" data-act="toggleActiveReflectNodeSelection">${selected ? '選択解除' : 'このノードを選択'}</button>
      <button class="btn ok" data-act="toggleActiveReflectNodeMode" title="${mode === 'src' ? '反映しない（比較先を維持）に切り替え' : '比較元の値で反映に切り替え'}">${mode === 'src' ? '比較先を維持に切替' : '比較元を採用に切替'}</button>
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
