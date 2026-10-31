'use strict';

import {
  FEATURE_DEFS,
  TAB_CONNECTION_NEEDS
} from '../constants.js';
import { state } from '../state.js';
import {
  esc
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
  getActiveDiffNormalizationLabels
} from '../diff/engine.js';
import { saveCurrentDialogState, getToolDocument } from './dialog.js';

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

export function renderDiffSelectionState() {
  if (!ui.diffSelectionState) return;
  const total = (state.lastDiffRows || []).length;
  const selected = getSelectedDiffRows().length;
  const rendered = getRenderedDiffRows().length;
  const issues = (state.lastFetchIssues || []).length;
  const partialIssues = (state.lastPartialIssues || []).length;
  const normalization = getActiveDiffNormalizationLabels();
  if (!total && !issues && !partialIssues && !state.lastDiffAt) {
    ui.diffSelectionState.textContent = '⏳ まだ差分を実行していません';
    ui.diffSelectionState.classList.add('is-empty-state');
    return;
  }
  ui.diffSelectionState.classList.remove('is-empty-state');
  ui.diffSelectionState.textContent =
    `選択 ${selected}/${total}件 ・ 表示 ${rendered}件 ・ API失敗 ${issues}件 ・ 本文未検証 ${partialIssues}件 ・ 出力 ${resolveDiffExportMode() === 'all' ? '全差分' : resolveDiffExportMode() === 'selected' ? '選択差分' : resolveDiffExportMode() === 'visible' ? '現在表示中' : '全差分'} ・ 内容 ${getDiffExportContentLabel(resolveDiffExportContentMode())} ・ 正規化 ${normalization.join(', ') || '-'}`;
}

export function renderDiffWarningBox() {
  if (!ui.diffWarnBox) return;
  const warning = deps.buildDiffWarningInfo(state.lastDiffRows, state.lastFetchIssues, state.lastPartialIssues);
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

function resolveBundleRevision(bundle) {
  const revisions = bundle?.meta?.sectionRevisions || ({} as any);
  for (const key of ['appSettings', 'fieldSettings', 'layoutSettings', 'viewSettings', 'processSettings']) {
    const revision = revisions[key];
    if (revision != null && revision !== '') return String(revision);
  }
  const first = Object.values(revisions).find((value) => value != null && value !== '');
  return first != null ? String(first) : '';
}
