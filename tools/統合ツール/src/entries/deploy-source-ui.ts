'use strict';

/**
 * 本番反映（lite）の「反映元アプリから本番へ」の画面。
 * 反映元（開発・検証用アプリ、または設定JSON）の設定との差分を抽出し、反映する差分を設定値 1 つずつ選び、
 * 主な値は入力欄・残りは JSON で直してから、反映先のプレビューへ書き込み、続けて本番へ反映する（アプリを更新）。
 *
 * 5 段階: 1 対象を選ぶ → 2 差分を選ぶ → 3 内容を修正 → 4 最終確認 → 5 結果。
 * エンジンは tabs/reflect-standalone.ts（差分の抽出・選択の作り直し）と tabs/deploy-source-standalone.ts（連続反映）、
 * reflect/selection.ts と各型だけで使う。ブラウザの永続ストレージは使わない（メモリだけ）。
 */

import { DEFAULT_APP_ID } from '../constants.js';
import { runSourceToProductionStandalone } from '../tabs/deploy-source-standalone.js';
import {
  previewReflectStandalone,
  reflectConnectionError,
  resolveReflectAppsStandalone,
  type ReflectOptions,
  type ReflectSectionUpdate
} from '../tabs/reflect-standalone.js';
import type { SourceDeployGoal, SourceDeployResult } from '../deploy/sourceTypes.js';
import {
  buildSourceSetupSignature,
  collectRemovedSettings,
  collectSelectionBlockers,
  composedAfterMap,
  countExtraction,
  describeExtractionSummary,
  describeRoute,
  firstBlockerText,
  firstEditEntryBlockerText,
  scopesCoveredBy,
  sectionsToRun,
  sourceBackupDescriptions,
  sourceRunLabel,
  sourceUndoGuidance,
  summarizeItemKinds,
  type SelectionBlockerResult
} from '../deploy/sourceDisplay.js';
import {
  buildSourceDeployRecordMarkdown,
  describeSourceDeployResult,
  stringifySourceDeployResultJson,
  type SourceEnvironment,
  type SourceRecordInput,
  type SourceRecordSection
} from '../deploy/sourceReport.js';
import {
  applySelection,
  createSourceSession,
  recomposeSession,
  setJsonOverride,
  setOverride,
  clearOverrides,
  type SourceSession
} from '../deploy/sourceSession.js';
import { appSettingsPath } from '../deploy/display.js';
import type { DeployAppStatus } from '../deploy/types.js';
import { createApplyProgressRows, type ApplyProgressRow, type ApplyProgressStatus } from '../reflect/applyProgress.js';
import {
  FIELD_SETTINGS_OMITTED_NOTICE,
  describeReflectScope,
  groupReflectScopes,
  guestIdFromPagePath,
  lookupMapError,
  lookupMapValue,
  needsAppReferenceParse,
  parseAppReference,
  parseLookupMapText,
  shouldWarnMissingFieldSettings
} from '../reflect/liteSetup.js';
import { REFLECT_SECTION_KEYS, reflectSectionLabel } from '../reflect/sections.js';
import { createReflectAppLookupCache, formatReflectAppName, isLookupableReflectApp, REFLECT_APP_LOOKUP_FAILURE, type ReflectAppLookupOk } from '../reflect/appLookup.js';
import { pickAllSettingsBundles } from '../settingsBundleImport.js';
import { buildAppFilenameLabel, buildExportFilename, downloadText, extractAppNameFromBundle } from '../utils.js';
import { createAppSearchControl } from './appSearchControl.js';
import { createProgressView, el, firstLines, setButtonText, type ProgressView } from './deployProgressView.js';
import { createEditView } from './deploy-source-edit.js';
import { createSelectView, renderTargetPending } from './deploy-source-select.js';
import { ensureSourceStyles } from './deploy-source-style.js';
import {
  attachCardHelp,
  copyTextToClipboard,
  createLitePanel,
  liteRun,
  makeButton,
  makeCard,
  makeCheck,
  makeChip,
  makeDetails,
  makeDialog,
  makeInput,
  makeNote,
  makeSelect,
  makeTextarea
} from './litePanelTheme.js';
import { appendReflectItems, createApplyProgressView, type ApplyProgressView } from './reflectPlanView.js';

type LitePanelHandle = ReturnType<typeof createLitePanel>;

export type SourceStage = 'setup' | 'select' | 'edit' | 'confirm' | 'result';
type SourceKind = SourceEnvironment;

/** 置換型の項目（反映元の内容で置き換える）。チップに「置換」の目印を付ける。 */
const REPLACING_SCOPE_KEYS = new Set(['appAcl', 'fieldAcl', 'recordPermissions', 'notifications', 'perRecordNotifications', 'reminderNotifications', 'processSettings']);
const DEFAULT_SCOPES = ['fieldSettings', 'layoutSettings', 'viewSettings'];

// =============================================================================
// メモリ状態（リロードで消える。lite はブラウザ永続ストレージを使わない方針）
// =============================================================================

interface RunContext {
  goal: SourceDeployGoal;
  source: SourceRecordInput['source'];
  target: SourceRecordInput['target'];
  preserveTargetOnly: boolean;
  lookupMap: Record<string, string>;
  targetPending: SourceRecordInput['targetPending'];
  allowPendingChanges: boolean;
  sections: SourceRecordSection[];
  startedAt: string;
}

interface SourceRunSnapshot { result: SourceDeployResult; context: RunContext; finishedAt: string }

interface SourceMemory {
  kind: SourceKind;
  sourceApp: string;
  sourceGuest: string;
  targetApp: string;
  targetGuest: string;
  scopes: string[];
  preserve: boolean;
  lookupText: string;
  goal: SourceDeployGoal;
  lastRun: SourceRunSnapshot | null;
}

const memory: SourceMemory = { kind: 'production', sourceApp: '', sourceGuest: '', targetApp: '', targetGuest: '', scopes: [...DEFAULT_SCOPES], preserve: true, lookupText: '', goal: 'production', lastRun: null };

export interface SourceFlow {
  /** 段階の移動と本文（切り替え時にパネルへ差し込む） */
  workspace: HTMLElement;
  /** 固定フッター（ステータス・結果欄を含む） */
  dock: HTMLElement;
  /** 表示したとき（切り替え時）に呼ぶ。ステータス・結果欄を自分のフッターへ移し、主操作を登録する */
  activate(): void;
  /** 見えなくなったとき（切り替え時）に呼ぶ。入力中のアプリ名の確認など、待機中の通信を止める */
  deactivate(): void;
  /** パネルの実行中の切り替え（deploy-lite-ui の setBusy から呼ぶ） */
  setBusy(value: boolean): void;
}

export function createSourceFlow(panel: LitePanelHandle): SourceFlow {
  ensureSourceStyles();
  const runLite = <T,>(busyMsg: string, fn: () => Promise<T>, okMsg?: string) => liteRun(panel, busyMsg, async () => {
    panel.setResult('');
    return fn();
  }, okMsg);

  let busy = false;
  let ready = false;
  let activeStage: SourceStage = 'setup';
  let session: SourceSession | null = null;
  let revision = 0;
  let confirmedToken = '';
  let requiredId = '';
  let pendingRequired = false;
  let progress: ApplyProgressView | null = null;
  let deployProgress: ProgressView | null = null;
  let running = false;
  let composeTimer = 0;
  let currentRunGoal: SourceDeployGoal = 'production';
  /** 最後に差分の選択・修正の画面を描画したときの鮮度（鮮度が変わったときだけ描画し直す） */
  let viewsFresh = false;
  /** この流れが画面に出ているか（出ていない間は、アプリ名の確認の通信をしない） */
  let shown = false;
  let showStage: (stage: SourceStage) => void = () => {};
  let refreshWorkflow: () => void = () => {};

  const pageGuest = () => guestIdFromPagePath(window.location?.pathname || '');

  // ---------------------------------------------------------------------------
  // 段階 1: 対象を選ぶ
  // ---------------------------------------------------------------------------
  const srcApp = makeInput({ placeholder: '反映元アプリID', value: memory.sourceApp, width: 'id' });
  const srcGuest = makeInput({ placeholder: 'ゲストID', value: memory.sourceGuest, width: 'guest' });
  const defaultsToCurrentApp = !memory.targetApp && !!DEFAULT_APP_ID;
  const tgtApp = makeInput({ placeholder: '反映先アプリID', value: memory.targetApp || DEFAULT_APP_ID || '', width: 'id' });
  const tgtGuest = makeInput({ placeholder: 'ゲストID', value: defaultsToCurrentApp ? pageGuest() : memory.targetGuest, width: 'guest' });
  srcApp.setAttribute('aria-label', '反映元アプリID');
  srcGuest.setAttribute('aria-label', '反映元ゲストスペースID');
  tgtApp.setAttribute('aria-label', '反映先アプリID');
  tgtGuest.setAttribute('aria-label', '反映先ゲストスペースID');
  for (const input of [srcApp, tgtApp]) input.inputMode = 'numeric';

  let jsonBundle: any = null;
  let jsonBundles: any[] = [];
  let jsonToken = '';
  let jsonFileName = '';

  // 入力中のアプリ名確認（進行はブロックしない。厳密な確認は差分の抽出時の resolveReflectAppsStandalone）
  const appLookupCache = createReflectAppLookupCache();
  function createAppNote(appInput: HTMLInputElement, guestInput: HTMLInputElement, isActive: () => boolean) {
    const node = el('div', 'kus-ds-app-note');
    node.setAttribute('aria-live', 'polite');
    let key = '\u0000';
    let seq = 0;
    let timer: number | undefined;
    let failed = false;
    const paint = (text: string, tone: '' | 'ok' | 'warn' = '') => {
      node.textContent = text;
      node.classList.toggle('kus-ds-app-note--ok', tone === 'ok');
      node.classList.toggle('kus-ds-app-note--warn', tone === 'warn');
    };
    const show = (info: ReflectAppLookupOk) => { failed = false; paint(`✓ ${formatReflectAppName(info)}`, 'ok'); refreshWorkflow(); };
    function refresh() {
      const appId = appInput.value.trim();
      const guest = guestInput.value.trim();
      const active = isActive() && isLookupableReflectApp(appId, guest);
      const nextKey = active ? `${guest}|${appId}` : '';
      if (nextKey === key) return;
      key = nextKey;
      seq += 1;
      failed = false;
      window.clearTimeout(timer);
      if (!active) { paint(''); return; }
      const cached = appLookupCache.peek(appId, guest);
      if (cached) { show(cached); return; }
      paint('確認中…');
      const mine = seq;
      timer = window.setTimeout(async () => {
        if (!panel.root.isConnected) return;
        const result = await appLookupCache.get(appId, guest);
        if (mine !== seq || !panel.root.isConnected) return;
        if (result.ok) show(result); else { failed = true; paint('message' in result ? result.message : REFLECT_APP_LOOKUP_FAILURE, 'warn'); }
      }, 350);
    }
    function adopt(info: ReflectAppLookupOk) {
      const appId = appInput.value.trim();
      const guest = guestInput.value.trim();
      if (!isActive() || info.appId !== appId || !isLookupableReflectApp(appId, guest)) return;
      key = `${guest}|${appId}`;
      seq += 1;
      window.clearTimeout(timer);
      show(info);
    }
    const recheck = () => { if (!failed) return; key = '\u0000'; refresh(); };
    appInput.addEventListener('change', recheck);
    guestInput.addEventListener('change', recheck);
    return { el: node, refresh, adopt, stop() { seq += 1; window.clearTimeout(timer); } };
  }
  const sourceNote = createAppNote(srcApp, srcGuest, () => shown && currentKind() !== 'json');
  const targetNote = createAppNote(tgtApp, tgtGuest, () => shown);
  panel.root.addEventListener('kus-lite-dispose', () => { sourceNote.stop(); targetNote.stop(); }, { once: true });

  const cardApp = makeCard({ title: '反映元と反映先のアプリ', number: 1 });
  const route = el('div', 'kus-ds-route');
  const sourceEndpoint = el('section', 'kus-ds-endpoint');
  sourceEndpoint.appendChild(el('div', 'kus-ds-endpoint__eyebrow', '反映元 · 設定を読み取る'));
  const kindSelect = makeSelect([['production', 'アプリの本番設定から取得'], ['preview', 'アプリのプレビュー設定から取得'], ['json', '設定JSONから取得']], memory.kind);
  kindSelect.setAttribute('aria-label', '反映元の取得方法');
  kindSelect.dataset.sourceKind = 'true';
  sourceEndpoint.appendChild(kindSelect);
  function labeled(input: HTMLInputElement, caption: string) {
    const label = el('label', 'kus-ds-field');
    label.append(el('span', '', caption), input);
    return label;
  }
  const sourceAppFields = el('div');
  const sourceGuestDetails = makeDetails('ゲストスペースを指定', { open: !!srcGuest.value });
  sourceGuestDetails.body.appendChild(labeled(srcGuest, 'ゲストスペースID（任意）'));
  const currentSrcBtn = makeButton('現在のアプリを反映元', 'sub');
  sourceAppFields.append(labeled(srcApp, 'アプリID'), sourceNote.el, sourceGuestDetails.details, currentSrcBtn);
  const sourceJsonFields = el('div');
  sourceJsonFields.hidden = true;
  const jsonFile = document.createElement('input');
  jsonFile.type = 'file';
  jsonFile.accept = '.json,application/json';
  jsonFile.className = 'kus-lp__file';
  jsonFile.setAttribute('aria-label', '反映元の設定JSON');
  const jsonAppSelect = makeSelect([]);
  jsonAppSelect.setAttribute('aria-label', '設定JSON内の反映元アプリ');
  jsonAppSelect.hidden = true;
  const jsonClearBtn = makeButton('クリア', 'ghost');
  jsonClearBtn.hidden = true;
  const jsonNote = el('div', 'kus-lp__small');
  jsonNote.hidden = true;
  sourceJsonFields.append(jsonFile, jsonAppSelect, jsonClearBtn, jsonNote);
  sourceEndpoint.append(sourceAppFields, sourceJsonFields);

  const targetEndpoint = el('section', 'kus-ds-endpoint kus-ds-endpoint--target');
  targetEndpoint.appendChild(el('div', 'kus-ds-endpoint__eyebrow', '反映先 · 設定を書き込む'));
  const targetNoteText = el('div', 'kus-ds-endpoint__note');
  const targetGuestDetails = makeDetails('ゲストスペースを指定', { open: !!tgtGuest.value });
  targetGuestDetails.body.appendChild(labeled(tgtGuest, 'ゲストスペースID（任意）'));
  const currentTgtBtn = makeButton('現在のアプリを反映先', 'sub');
  targetEndpoint.append(targetNoteText, labeled(tgtApp, 'アプリID'), targetNote.el, targetGuestDetails.details, currentTgtBtn);
  const arrow = el('div', 'kus-ds-arrow-col', '→');
  arrow.setAttribute('aria-hidden', 'true');
  route.append(sourceEndpoint, arrow, targetEndpoint);
  cardApp.body.appendChild(route);
  cardApp.body.appendChild(createAppSearchControl(panel, {
    targets: [
      { label: '反映元', apply: (id, _name, guestId) => { if (currentKind() === 'json') setKind('production'); srcApp.value = id; srcGuest.value = guestId || ''; onInputsChanged(); } },
      { label: '反映先', apply: (id, _name, guestId) => { tgtApp.value = id; tgtGuest.value = guestId || ''; onInputsChanged(); } }
    ]
  }));
  cardApp.body.appendChild(makeNote('反映元の設定を読み取り、反映先のプレビューへ書き込みます。反映先は本番のアプリで、書き込んだあとに本番へ反映します（目標を「プレビューまで」にすると、本番へは反映しません）。', 'help'));

  // 反映する項目
  const cardScope = makeCard({ title: '反映する項目', number: 2 });
  const putSections = REFLECT_SECTION_KEYS.map((key) => ({ key, label: reflectSectionLabel(key) }));
  const initialScopes = new Set(memory.scopes);
  const chips = putSections.map((section) => {
    const chip = makeChip({ label: section.label, checked: initialScopes.has(section.key), value: section.key });
    const hint = describeReflectScope(section.key);
    chip.checkbox.setAttribute('aria-label', section.label);
    if (hint) {
      chip.label.title = `${section.label}: ${hint}`;
      const description = el('span', '', `${REPLACING_SCOPE_KEYS.has(section.key) ? '置換型の項目。' : ''}${hint}`);
      description.id = `kus-ds-scope-hint-${section.key}`;
      description.hidden = true;
      chip.label.appendChild(description);
      chip.checkbox.setAttribute('aria-describedby', description.id);
    }
    if (REPLACING_SCOPE_KEYS.has(section.key)) {
      const badge = el('span', 'kus-ds-chip__badge', '置換');
      badge.setAttribute('aria-hidden', 'true');
      chip.label.appendChild(badge);
    }
    chip.checkbox.addEventListener('change', onScopesChanged);
    return chip;
  });
  const scopeGroups = el('div', 'kus-ds-scope-groups');
  for (const group of groupReflectScopes(putSections.map((section) => section.key))) {
    const fieldset = el('fieldset', 'kus-ds-scope-group');
    fieldset.appendChild(el('legend', '', group.label));
    const list = el('div', 'kus-lp__chips');
    for (const key of group.keys) { const chip = chips.find((candidate) => candidate.checkbox.value === key); if (chip) list.appendChild(chip.label); }
    fieldset.appendChild(list);
    scopeGroups.appendChild(fieldset);
  }
  const fieldNotice = el('p', 'kus-ds-note kus-ds-note--warn', FIELD_SETTINGS_OMITTED_NOTICE);
  fieldNotice.hidden = true;
  cardScope.body.append(scopeGroups, fieldNotice);
  cardScope.body.appendChild(makeNote('標準はフィールド・レイアウト・一覧です。選んだ項目ごとに差分を抽出し、次の画面で設定値 1 つずつ選べます。', 'help'));

  // 目標
  const cardGoal = makeCard({ title: '目標', number: 3 });
  function makeChoice(name: string, value: string, title: string, description: string, checked: boolean) {
    const label = el('label', 'kus-dp-choice');
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = name;
    input.value = value;
    input.checked = checked;
    input.setAttribute('aria-label', title);
    const copy = el('span');
    copy.append(el('strong', '', title), el('small', '', description));
    label.append(input, copy);
    return { label, input };
  }
  const goalName = `${panel.root.id}-source-goal`;
  const goalProduction = makeChoice(goalName, 'production', '本番まで反映', '反映先のプレビューへ書き込み、続けて本番へ反映します（アプリを更新）。', memory.goal !== 'preview');
  const goalPreview = makeChoice(goalName, 'preview', 'プレビューまで（本番へは反映しない）', '反映先のプレビューへ書き込むだけです。本番へは反映しません。', memory.goal === 'preview');
  const goalGroup = el('div', 'kus-dp-choices');
  goalGroup.setAttribute('role', 'radiogroup');
  goalGroup.setAttribute('aria-label', '目標');
  goalGroup.append(goalProduction.label, goalPreview.label);
  cardGoal.body.append(goalGroup);
  cardGoal.body.appendChild(makeNote('目標は最終確認でも確認します。「プレビューまで」を選んだ場合も、あとから「プレビューの変更を公開」で本番へ反映できます。', 'help'));

  // 詳細設定（反映先だけの一覧・グラフ・アクションの扱い・参照先変換）
  const detail = makeDialog({ title: '詳細設定', id: 'kus-ds-detail' });
  const preserve = makeCheck({ label: '反映先だけの一覧・グラフ・アクションを保持する', checked: memory.preserve });
  preserve.checkbox.setAttribute('aria-label', '反映先だけの一覧・グラフ・アクションを保持する');
  const preserveCard = makeCard({ title: '一覧・グラフ・アクションの扱い', soft: true });
  preserveCard.body.append(preserve.label, makeNote('標準はON（保持）です。OFFにすると、反映元にない一覧・グラフ・アクションの削除が差分に出ます。', 'help'));
  const lookupTa = makeTextarea({ rows: 4, code: true, placeholder: '1 行ずつ「旧AppID → 新AppID」（例: 10 → 25）', value: memory.lookupText });
  lookupTa.setAttribute('aria-label', '参照先変換（旧AppID → 新AppID）');
  const lookupError = el('p', 'kus-ds-json__error');
  lookupError.hidden = true;
  const lookupCard = makeCard({ title: '参照先変換', soft: true });
  lookupCard.body.append(lookupTa, lookupError, makeNote('ルックアップ・関連レコード一覧・アクションのコピー先が参照するアプリIDを、反映先の環境のIDへ読み替えます。JSON形式（{"旧":"新"}）も使えます。', 'help'));
  detail.body.append(preserveCard.card, lookupCard.card);
  attachCardHelp(detail.body);
  const detailBtn = makeButton('詳細設定…', 'sub');
  detailBtn.setAttribute('aria-haspopup', 'dialog');
  detailBtn.addEventListener('click', () => detail.open());
  const detailSummary = el('span', 'kus-dp-detail-summary');
  const detailRow = el('div', 'kus-dp-detail-row');
  detailRow.append(detailBtn, detailSummary);

  const setupStage = el('div', 'kus-dp-setup');
  setupStage.append(cardApp.card, cardScope.card, cardGoal.card, detailRow);

  const currentKind = (): SourceKind => (kindSelect.value === 'json' ? 'json' : kindSelect.value === 'preview' ? 'preview' : 'production');
  const currentGoal = (): SourceDeployGoal => (goalPreview.input.checked ? 'preview' : 'production');
  const activeScopes = (): string[] => REFLECT_SECTION_KEYS.filter((key) => chips.some((chip) => chip.checkbox.value === key && chip.checkbox.checked));
  const currentLookup = () => parseLookupMapText(lookupTa.value);

  function currentOptions(scopes = activeScopes()): ReflectOptions {
    const kind = currentKind();
    return {
      sourceAppId: kind === 'json' ? String(jsonBundle?.appId || srcApp.value.trim()) : srcApp.value.trim(),
      sourceGuestId: kind === 'json' ? '' : srcGuest.value.trim(),
      sourcePreview: kind === 'preview',
      ...(kind === 'json' ? { sourceBundle: jsonBundle } : {}),
      targetAppId: tgtApp.value.trim(),
      targetGuestId: tgtGuest.value.trim(),
      scopes,
      lookupMap: lookupMapValue(currentLookup()),
      preserveTargetOnly: preserve.checkbox.checked
    };
  }

  function currentSignature(): string {
    const options = currentOptions();
    return buildSourceSetupSignature({
      sourceKind: currentKind(),
      sourceAppId: options.sourceAppId,
      sourceGuestId: options.sourceGuestId || '',
      jsonToken: currentKind() === 'json' ? jsonToken : '',
      targetAppId: options.targetAppId,
      targetGuestId: options.targetGuestId || '',
      preserveTargetOnly: !!options.preserveTargetOnly,
      lookupMap: options.lookupMap || {}
    });
  }

  /** 抽出結果が現在の入力と一致し、現在の項目が抽出時の項目の部分集合か。 */
  function isFresh(): boolean {
    return !!session && session.signature === currentSignature() && scopesCoveredBy(activeScopes(), session.scopes);
  }

  /** 次に進めない理由（空なら進める）。 */
  function setupBlocker(): string {
    const kind = currentKind();
    if (kind === 'json' && !jsonBundle) return '反映元の設定JSONを読み込んでください。';
    const lookupMessage = lookupMapError(currentLookup());
    const connection = reflectConnectionError(currentOptions());
    if (connection) return connection;
    if (!activeScopes().length) return '反映する項目を選んでください。';
    if (lookupMessage) return lookupMessage;
    return '';
  }

  function setKind(kind: SourceKind) {
    kindSelect.value = kind;
    syncKindFields();
  }

  function syncKindFields() {
    const kind = currentKind();
    sourceAppFields.hidden = kind === 'json';
    sourceJsonFields.hidden = kind !== 'json';
    jsonAppSelect.hidden = jsonBundles.length < 2;
    jsonClearBtn.hidden = !jsonBundle;
    jsonNote.hidden = !jsonBundle;
    if (jsonBundle) {
      const appName = extractAppNameFromBundle(jsonBundle);
      jsonNote.textContent = `設定JSONを読み込み済み${jsonFileName ? `（${jsonFileName}）` : ''}: アプリ #${jsonBundle?.appId || '-'}${appName ? ` (${appName})` : ''}。反映元はこのJSONから取得し、アプリからは取得しません。`;
    }
  }

  function describeDetail(): { text: string; warn: boolean } {
    const lookup = currentLookup();
    const parts = [preserve.checkbox.checked ? '反映先だけの一覧・グラフ・アクションを保持' : '反映先だけの一覧・グラフ・アクションを削除', lookup.ok ? (lookup.count ? `参照先変換 ${lookup.count} 件` : '参照先変換なし') : '参照先変換に誤りあり'];
    return { text: `詳細設定: ${parts.join(' / ')}`, warn: !preserve.checkbox.checked || !lookup.ok };
  }

  function onInputsChanged() {
    memory.kind = currentKind();
    memory.sourceApp = srcApp.value;
    memory.sourceGuest = srcGuest.value;
    memory.targetApp = tgtApp.value;
    memory.targetGuest = tgtGuest.value;
    memory.scopes = activeScopes();
    memory.preserve = preserve.checkbox.checked;
    memory.lookupText = lookupTa.value;
    memory.goal = currentGoal();
    if (srcGuest.value) sourceGuestDetails.details.open = true;
    if (tgtGuest.value) targetGuestDetails.details.open = true;
    sourceNote.refresh();
    targetNote.refresh();
    syncKindFields();
    const summary = describeDetail();
    detailSummary.textContent = summary.text;
    detailSummary.classList.toggle('kus-dp-detail-summary--warn', summary.warn);
    const lookupMessage = lookupMapError(currentLookup());
    lookupError.textContent = lookupMessage;
    lookupError.hidden = !lookupMessage;
    fieldNotice.hidden = !shouldWarnMissingFieldSettings(activeScopes()) || !activeScopes().length;
    targetNoteText.textContent = currentGoal() === 'production' ? '書き込むのは反映先のプレビュー。続けて本番へ反映します' : '書き込むのは反映先のプレビューだけです';
    // 抽出後に条件が変わったら、確認は解除して差分の抽出からやり直す（署名の比較）。
    bump();
    if (ready && isFresh() !== viewsFresh) renderViews();
    refreshWorkflow();
  }

  function renderViews() {
    viewsFresh = isFresh();
    selectView.render();
    editView.render();
  }

  /** 反映する項目だけが変わったとき。抽出時の項目の部分集合なら抽出結果を使い続け、選択と反映内容を作り直す。 */
  function onScopesChanged() {
    memory.scopes = activeScopes();
    fieldNotice.hidden = !shouldWarnMissingFieldSettings(activeScopes()) || !activeScopes().length;
    bump();
    if (session && isFresh()) recompose();
    if (ready) renderViews();
    refreshWorkflow();
  }

  for (const input of [srcApp, srcGuest, tgtApp, tgtGuest]) input.addEventListener('input', onInputsChanged);
  for (const input of [goalProduction.input, goalPreview.input, preserve.checkbox]) input.addEventListener('change', onInputsChanged);
  lookupTa.addEventListener('input', onInputsChanged);
  kindSelect.addEventListener('change', () => { onInputsChanged(); });

  // アプリ URL の貼り付け・入力から ID を読み取る（/k/123/、/k/guest/5/123/、?app=123）。
  function adoptAppReference(appInput: HTMLInputElement, guestInput: HTMLInputElement, guestDetails: HTMLDetailsElement, sideLabel: string, text = appInput.value) {
    if (!needsAppReferenceParse(text)) return false;
    const reference = parseAppReference(text);
    if (!reference) { panel.setStatus(`${sideLabel}のアプリIDを読み取れません。数字のID、またはアプリのURLを入力してください。`, 'warn'); return false; }
    const clearedGuest = !reference.guestId && !!guestInput.value.trim();
    appInput.value = reference.appId;
    guestInput.value = reference.guestId;
    if (reference.guestId) guestDetails.open = true;
    onInputsChanged();
    panel.setStatus(`URLから${sideLabel}のアプリID ${reference.appId}${reference.guestId ? `（ゲストスペース ${reference.guestId}）` : ''}を読み取りました。${clearedGuest ? 'ゲストスペースIDは空にしました。' : ''}`, 'ok');
    return true;
  }
  for (const [appInput, guestInput, guestDetails, sideLabel] of [
    [srcApp, srcGuest, sourceGuestDetails.details, '反映元'],
    [tgtApp, tgtGuest, targetGuestDetails.details, '反映先']
  ] as const) {
    appInput.addEventListener('paste', (event) => {
      const pasted = event.clipboardData?.getData('text') || '';
      if (!needsAppReferenceParse(pasted)) return;
      if (adoptAppReference(appInput, guestInput, guestDetails, sideLabel, pasted)) event.preventDefault();
    });
    appInput.addEventListener('change', () => { adoptAppReference(appInput, guestInput, guestDetails, sideLabel); });
  }
  currentSrcBtn.addEventListener('click', () => { srcApp.value = DEFAULT_APP_ID || ''; srcGuest.value = DEFAULT_APP_ID ? pageGuest() : srcGuest.value; onInputsChanged(); panel.setStatus('現在のアプリを反映元にセットしました。', 'info'); });
  currentTgtBtn.addEventListener('click', () => { tgtApp.value = DEFAULT_APP_ID || ''; tgtGuest.value = DEFAULT_APP_ID ? pageGuest() : tgtGuest.value; onInputsChanged(); panel.setStatus('現在のアプリを反映先にセットしました。', 'info'); });

  // 設定JSON
  function renderJsonAppSelect() {
    jsonAppSelect.replaceChildren(...jsonBundles.map((bundle, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      const appName = extractAppNameFromBundle(bundle);
      option.textContent = `アプリ #${bundle.appId}${appName ? ` (${appName})` : ''}`;
      return option;
    }));
  }
  jsonFile.addEventListener('change', () => runLite('反映元の設定JSONを読み込み中…', async () => {
    const file = jsonFile.files?.[0];
    if (!file) return;
    jsonFile.value = '';
    jsonBundle = null; jsonBundles = []; jsonToken = ''; jsonFileName = '';
    let parsed: unknown;
    try { parsed = JSON.parse(await file.text()); } catch { throw new Error('設定JSONの読み込みに失敗しました（JSON形式が不正です）'); }
    jsonBundles = pickAllSettingsBundles(parsed, 'source', true);
    renderJsonAppSelect();
    jsonBundle = jsonBundles[0];
    jsonToken = `${file.name}:${file.size}:${file.lastModified}:${Date.now()}`;
    jsonFileName = file.name;
    onInputsChanged();
    panel.setStatus(`反映元の設定JSONを読み込みました（アプリ #${jsonBundle?.appId || '-'}）。`, 'ok');
  }));
  jsonAppSelect.addEventListener('change', () => { jsonBundle = jsonBundles[Number(jsonAppSelect.value)]; onInputsChanged(); });
  jsonClearBtn.addEventListener('click', () => {
    jsonBundle = null; jsonBundles = []; jsonToken = ''; jsonFileName = ''; jsonFile.value = '';
    onInputsChanged();
    panel.setStatus('読み込んだ設定JSONをクリアしました。設定JSONを選び直してください。', 'info');
  });

  // ---------------------------------------------------------------------------
  // 差分の抽出・選択・作り直し
  // ---------------------------------------------------------------------------
  function recompose() {
    window.clearTimeout(composeTimer);
    composeTimer = 0;
    if (session) recomposeSession(session, activeScopes());
  }
  function flushRecompose() { if (composeTimer) recompose(); }
  function scheduleRecompose() {
    window.clearTimeout(composeTimer);
    composeTimer = window.setTimeout(() => { recompose(); afterComposed(); }, 200);
  }
  function afterComposed() {
    selectView.refresh();
    editView.refresh();
    refreshWorkflow();
  }

  /** 段階 1〜3 の内容が変わった。確認済みなら解除する（確認は、変更前の内容に対するもの）。 */
  function bump() {
    revision += 1;
    if (confirmedToken && confirmedToken !== confirmationToken()) clearConfirmation();
  }

  function selectionBlockers(): SelectionBlockerResult {
    if (!session || !isFresh()) return { failed: [], problems: [], references: [], empty: false };
    return collectSelectionBlockers({ entries: session.preview.entries, activeScopes: activeScopes(), models: session.models, composed: session.composed });
  }
  /** 「内容の修正」へ進めない理由（空なら進める）。修正内容の問題（JSON の形式など）は修正の画面で直す。 */
  function editEntryBlocker(): string {
    if (!session || !isFresh()) return '';
    if (session.composeError) return `選んだ内容から反映内容を作れません（${firstLines(session.composeError, 1)}）。`;
    return firstEditEntryBlockerText(selectionBlockers());
  }
  function stageBlocker(): string {
    if (!session || !isFresh()) return '';
    // JSON の入力欄に、適用していない変更があるときは進めない（適用しないまま進むと、直した内容が送られない）。
    const unapplied = editView.unappliedJson();
    if (unapplied.length) return `${unapplied.join('、')}のJSONの変更がまだ適用されていません。「JSONを適用」を押すか、「JSONの編集を閉じる」で取り消してください。`;
    if (session.composeError) return `選んだ内容から反映内容を作れません（${firstLines(session.composeError, 1)}）。`;
    return firstBlockerText(selectionBlockers());
  }

  const selectView = createSelectView({
    session: () => session,
    activeScopes,
    isFresh,
    blockers: selectionBlockers,
    notify: (message) => panel.setStatus(message, 'info'),
    dropScope: (key) => {
      const chip = chips.find((candidate) => candidate.checkbox.value === key);
      if (!chip) return;
      chip.checkbox.checked = false;
      onScopesChanged();
      panel.setStatus(`${reflectSectionLabel(key)}を反映する項目から外しました。`, 'info');
    },
    changeSelection: (ids, on) => {
      const result = session ? applySelection(session, ids, on) : { changed: [], required: [], cascaded: [] };
      if (result.changed.length) { bump(); recompose(); afterComposed(); }
      return result;
    }
  });
  const editView = createEditView({
    session: () => session,
    activeScopes,
    isFresh,
    notify: (message) => panel.setStatus(message, 'info'),
    setOverride: (sectionKey, pointer, value, defaultValue, debounce) => {
      if (!session) return;
      setOverride(session, sectionKey, pointer, value, defaultValue);
      bump();
      if (debounce) { scheduleRecompose(); refreshWorkflow(); } else { recompose(); afterComposed(); }
    },
    resetSection: (sectionKey) => {
      if (!session) return;
      clearOverrides(session, sectionKey);
      bump(); recompose(); afterComposed();
    },
    applyJson: (sectionKey, json) => {
      if (!session) return;
      setJsonOverride(session, sectionKey, json);
      bump(); recompose(); afterComposed();
    },
    jsonEditsChanged: () => refreshWorkflow()
  });

  async function startExtract() {
    if (busy) return;
    const blocker = setupBlocker();
    if (blocker) { panel.setStatus(blocker, 'warn'); return; }
    const options = currentOptions();
    const signature = currentSignature();
    const kind = currentKind();
    await runLite('差分を抽出中…', async () => {
      panel.setStatus('反映元と反映先のアプリを確認中…', 'busy');
      const identities = await resolveReflectAppsStandalone(options);
      if (kind !== 'json') sourceNote.adopt({ ok: true, appId: identities.source.appId, name: identities.source.name, code: identities.source.code });
      targetNote.adopt({ ok: true, appId: identities.target.appId, name: identities.target.name, code: identities.target.code });
      const preview = await previewReflectStandalone(options, (message) => panel.setStatus(message, 'busy'));
      session = createSourceSession({ signature, opts: options, identities, sourceEnvironment: kind, preview });
      bump();
      clearConfirmation();
      recompose();
      viewsFresh = true;
      showStage('select');
      const counts = countExtraction(preview.entries);
      const summary = describeExtractionSummary(counts);
      if (counts.error) panel.setStatus(`${summary}取得失敗の項目は、反映しない項目から外すか、抽出し直してください。まだ書き込んでいません。`, 'warn');
      else if (!counts.change) panel.setStatus(`${summary}まだ書き込んでいません。`, 'info');
      else panel.setStatus(`${summary}反映する変更を選んでください。まだ書き込んでいません。`, 'ok');
    });
  }

  // ---------------------------------------------------------------------------
  // 段階 4: 最終確認
  // ---------------------------------------------------------------------------
  const confirmBtn = makeButton('最終確認に進む', 'primary');
  const runBtn = makeButton(sourceRunLabel('production'), 'danger');
  runBtn.disabled = true;
  const confirmCard = makeCard({ title: 'この内容で反映先を変更します' });
  const confirmBody = el('div');
  const ack = makeCheck({ label: '上記の内容を確認しました', checked: false });
  ack.checkbox.setAttribute('aria-label', '上記の内容を確認しました');
  const confirmInput = makeInput({ width: 'wide', noSubmit: true });
  confirmInput.autocomplete = 'off';
  confirmInput.inputMode = 'numeric';
  confirmInput.setAttribute('data-lp-no-submit', '');
  const confirmLabel = el('label', 'kus-dp-confirm-label');
  const confirmInputWrap = el('div', 'kus-dp-confirm-input');
  confirmInputWrap.append(confirmLabel, confirmInput);
  const confirmStatus = el('p', 'kus-dp-quiet');
  confirmStatus.setAttribute('aria-live', 'polite');
  let pendingAck = makeCheck({ label: '', checked: false });
  confirmCard.body.append(confirmBody, ack.label, confirmInputWrap, confirmStatus);

  function confirmationToken(): string {
    return session && isFresh() ? `${session.id}:${revision}:${currentGoal()}` : '';
  }
  function clearConfirmation() {
    confirmedToken = '';
    ack.checkbox.checked = false;
    pendingAck.checkbox.checked = false;
    confirmInput.value = '';
    confirmStatus.textContent = '内容を確認して、チェックと入力をしてください。';
    runBtn.disabled = true;
  }
  function confirmationReady(): boolean {
    return !!confirmedToken && confirmedToken === confirmationToken() && ack.checkbox.checked
      && !!requiredId && confirmInput.value.trim() === requiredId
      && (!pendingRequired || pendingAck.checkbox.checked)
      && !stageBlocker();
  }
  function refreshConfirmState() {
    runBtn.disabled = busy || !confirmationReady();
    const missing: string[] = [];
    if (!ack.checkbox.checked) missing.push('確認のチェック');
    if (pendingRequired && !pendingAck.checkbox.checked) missing.push('未公開の変更の了承');
    if (confirmInput.value.trim() !== requiredId) missing.push('反映先アプリIDの入力');
    confirmStatus.textContent = confirmationReady() ? '確認できました。下の実行ボタンで実行できます。' : `${missing.join('と')}が必要です。`;
    refreshWorkflow();
  }
  for (const control of [ack.checkbox, confirmInput]) control.addEventListener('input', refreshConfirmState);

  function fact(key: string, title: string, mod = ''): { root: HTMLElement; dd: HTMLElement } {
    const root = el('div', `kus-dp-fact${mod ? ` kus-dp-fact--${mod}` : ''}`);
    root.dataset.confirm = key;
    const dd = el('dd');
    root.append(el('dt', '', title), dd);
    return { root, dd };
  }

  function sourceLabelText(current: SourceSession): string {
    const identity = current.identities.source;
    const where = current.sourceEnvironment === 'json' ? '設定JSON' : current.sourceEnvironment === 'preview' ? 'プレビュー設定' : '本番設定';
    return `${identity.name}（#${identity.appId}・${where}）`;
  }

  function openConfirmation() {
    if (busy || !session || !isFresh()) return;
    flushRecompose();
    if (stageBlocker()) return;
    const run = sectionsToRun(session.composed, activeScopes());
    if (!run.length) return;
    clearConfirmation();
    confirmedToken = confirmationToken();
    const goal = currentGoal();
    const target = session.identities.target;
    confirmCard.card.querySelector('.kus-lp__card-title')!.textContent = goal === 'production' ? 'この内容で反映先を変更し、本番へ反映します' : 'この内容で反映先のプレビューを変更します';
    confirmBody.replaceChildren();
    const facts = el('dl', 'kus-dp-facts');

    const routeFact = fact('route', '経路', 'direction');
    routeFact.dd.appendChild(el('div', 'kus-ds-route-line', describeRoute(sourceLabelText(session), `${target.name}（#${target.appId}）`, goal)));
    facts.appendChild(routeFact.root);

    const goalFact = fact('goal', '目標');
    goalFact.dd.textContent = goal === 'production' ? '本番まで反映（プレビューへ書き込み、続けて本番へ反映します）' : 'プレビューまで（本番へは反映しません）';
    facts.appendChild(goalFact.root);

    const sectionsFact = fact('sections', `反映する項目（${run.length} 項目）`);
    const list = el('div', 'kus-ds-confirm-sections');
    for (const section of run) {
      const box = el('div', 'kus-ds-confirm-section');
      box.dataset.confirmSection = section.sectionKey;
      const kinds = summarizeItemKinds(section.plan.items);
      const head = el('div', 'kus-ds-confirm-section__head');
      head.append(el('strong', '', section.label), el('span', '', `選んだ変更 ${section.selectedCount}/${section.totalCount}`), el('span', '', `修正した値 ${section.editedCount}`), el('span', '', kinds || `変更 ${section.plan.changeCount} 件`));
      box.appendChild(head);
      if (section.plan.items?.length) {
        const details = document.createElement('details');
        details.appendChild(el('summary', '', '変更の要約を表示'));
        let rendered = false;
        details.addEventListener('toggle', () => { if (details.open && !rendered) { rendered = true; appendReflectItems(details, { label: section.label, items: section.plan.items, sectionKey: section.sectionKey }); } });
        box.appendChild(details);
      }
      list.appendChild(box);
    }
    sectionsFact.dd.appendChild(list);
    facts.appendChild(sectionsFact.root);

    const removed = collectRemovedSettings(run);
    const removedFact = fact('removed', '削除される設定', removed.length ? 'danger' : '');
    if (removed.length) {
      removedFact.dd.appendChild(el('strong', '', `${removed.length} 件の設定が削除されます。`));
      const ul = el('ul', 'kus-dp-issues');
      ul.style.color = '#991b1b';
      for (const item of removed.slice(0, 30)) ul.appendChild(el('li', '', item.text));
      if (removed.length > 30) ul.appendChild(el('li', '', `ほか ${removed.length - 30} 件（全件は記録のMarkdownで確認できます）`));
      removedFact.dd.appendChild(ul);
      const removedFields = removed.filter((item) => item.isField).length;
      if (removedFields && goal === 'production') removedFact.dd.appendChild(el('strong', '', `削除されるフィールド（${removedFields} 件）は、本番へ反映すると、レコードの値も削除され、元に戻せません。`));
    } else {
      removedFact.dd.textContent = '削除される設定はありません。';
    }
    facts.appendChild(removedFact.root);

    const pending = session.preview.targetPending;
    // 以前からの未公開の変更が無いと確認できていない（pending・unknown・未指定）ときは、了承がなければ本番へ反映しない。
    const pendingState = pending?.state;
    pendingRequired = goal === 'production' && pendingState !== 'clean' && pendingState !== 'own';
    pendingAck = makeCheck({ label: pendingState === 'pending' ? '反映先プレビューの以前からの未公開の変更も、一緒に本番へ反映されることを了承しました' : '未公開の変更があるか確認できないまま、プレビューの内容がすべて本番へ反映されることを了承しました', checked: false });
    pendingAck.checkbox.setAttribute('aria-label', '未公開の変更も一緒に本番へ反映されることを了承する');
    pendingAck.checkbox.addEventListener('input', refreshConfirmState);
    const pendingFact = fact('pending', '反映先の未公開の変更', pendingRequired ? 'danger' : '');
    renderTargetPending(pendingFact.dd, pending, false);
    if (pendingRequired) {
      pendingFact.dd.appendChild(el('strong', '', pendingState === 'pending'
        ? '以前からの未公開の変更は、今回の反映と一緒に本番へ反映されます。'
        : '反映先に以前からの未公開の変更があるか確認できませんでした。本番へ反映すると、プレビューの内容がすべて本番へ反映されます。'));
      pendingFact.dd.appendChild(pendingAck.label);
    } else if (!pending) pendingFact.dd.textContent = '確認していません。';
    facts.appendChild(pendingFact.root);

    const backup = fact('backup', 'バックアップ');
    const backupList = el('ul', 'kus-dp-issues');
    backupList.style.color = '#334155';
    for (const line of sourceBackupDescriptions(goal)) backupList.appendChild(el('li', '', line));
    backup.dd.appendChild(backupList);
    const undo = fact('undo', '取り消し方', goal === 'production' ? 'danger' : '');
    undo.dd.textContent = sourceUndoGuidance(goal, pending);
    facts.append(backup.root, undo.root);
    confirmBody.appendChild(facts);

    requiredId = target.appId;
    confirmLabel.textContent = `反映先アプリID（${requiredId} と入力）`;
    confirmInput.placeholder = requiredId;
    confirmInput.setAttribute('aria-label', '確認用の反映先アプリID');
    confirmInput.id = `${panel.root.id}-source-confirm-input`;
    confirmLabel.htmlFor = confirmInput.id;
    setButtonText(runBtn, sourceRunLabel(goal));
    refreshConfirmState();
    showStage('confirm');
    panel.setStatus(`反映先と内容を確認してください。まだ${goal === 'production' ? '反映先へは書き込んで' : '反映先のプレビューへは書き込んで'}いません。`, 'info');
  }
  confirmBtn.addEventListener('click', openConfirmation);

  // ---------------------------------------------------------------------------
  // 段階 5: 結果
  // ---------------------------------------------------------------------------
  const resultCard = makeCard({ title: '実行結果' });
  const resultHead = el('div', 'kus-ds-result-head');
  resultHead.setAttribute('aria-live', 'polite');
  const resultNotes = el('div', 'kus-dp-result-notes');
  const applyCard = makeCard({ title: '反映先プレビューへの書き込み', soft: true });
  const applyHost = el('div');
  applyCard.body.appendChild(applyHost);
  const deployCard = makeCard({ title: '本番への反映', soft: true });
  const deployHost = el('div');
  deployCard.body.appendChild(deployHost);
  const resultTools = el('div', 'kus-dp-tools');
  const saveJsonBtn = makeButton('結果JSONを保存', 'sub');
  const saveRecordBtn = makeButton('記録をMarkdownで保存', 'sub');
  const copyRecordBtn = makeButton('記録をコピー', 'sub');
  const openSettingsBtn = makeButton('反映先アプリの設定画面を開く', 'sub');
  resultTools.append(saveJsonBtn, saveRecordBtn, copyRecordBtn, openSettingsBtn);
  const resultGrid = el('div', 'kus-ds-result-grid');
  resultGrid.append(resultHead, resultNotes, applyCard.card, deployCard.card, resultTools);
  resultCard.body.appendChild(resultGrid);
  const resultEmpty = el('div', 'kus-dp-empty', 'まだ実行していません。対象を選び、差分を選んで最終確認をしてから実行してください。');

  function progressRowsFromResult(result: SourceDeployResult): ApplyProgressRow[] {
    return result.apply.sections.map((section) => ({
      sectionKey: section.sectionKey, label: section.label, status: section.status as ApplyProgressStatus,
      ...(section.message ? { message: section.message } : {}), ...(section.stopped ? { stopped: true } : {})
    }));
  }

  function renderFinalProgress(last: SourceRunSnapshot) {
    progress = createApplyProgressView(applyHost, progressRowsFromResult(last.result));
    deployHost.replaceChildren();
    deployProgress?.dispose();
    deployProgress = null;
    deployCard.card.hidden = last.context.goal !== 'production';
    if (last.context.goal !== 'production') return;
    if (last.result.deploy) {
      deployProgress = createProgressView(deployHost, 'deploy', []);
      deployProgress.setOutcomes(last.result.deploy.apps);
    } else {
      const note = el('div', 'kus-ds-note kus-ds-note--warn');
      note.dataset.deploySkipped = 'true';
      note.append(el('strong', '', '本番へは反映していません'), el('span', '', last.result.deploySkipped || '本番への反映は行われませんでした。'));
      deployHost.appendChild(note);
    }
  }

  function renderResultCard() {
    const last = memory.lastRun;
    const showing = running || !!last;
    resultCard.card.hidden = !showing;
    resultEmpty.hidden = showing;
    if (!showing) return;
    resultNotes.replaceChildren();
    if (running || !last) {
      resultHead.textContent = `${currentRunGoal === 'preview' ? '反映先プレビューへの書き込み' : '反映先プレビューへの書き込みと本番への反映'}を実行中です。`;
      resultTools.hidden = true;
      applyCard.card.hidden = false;
      deployCard.card.hidden = currentRunGoal !== 'production';
      return;
    }
    resultTools.hidden = false;
    applyCard.card.hidden = false;
    const result = last.result;
    const message = describeSourceDeployResult(result);
    resultHead.textContent = message.text;
    resultHead.dataset.tone = message.tone;
    if (result.deploySkipped && !result.apply.cancelled) {
      const note = el('div', 'kus-ds-note kus-ds-note--warn');
      note.dataset.deploySkippedNote = 'true';
      note.append(el('strong', '', '本番へは反映していません'), el('span', '', result.deploySkipped), el('span', '', '反映先プレビューには書き込み済みです。「プレビューの変更を公開」から、続けて本番へ反映できます。'));
      resultNotes.appendChild(note);
    }
    const unverified = (result.deploy?.apps || []).filter((app) => app.status === 'success' && app.verified === false);
    if (unverified.length) {
      const note = el('div', 'kus-dp-warn', `注意: 反映後の状態（revision）が本番とプレビューで一致しませんでした。アプリの設定画面で確認してください。`);
      note.dataset.deployUnverified = String(unverified.length);
      resultNotes.appendChild(note);
    }
    const previewBackup = result.apply.backup;
    const previewNote = el('div', previewBackup ? 'kus-dp-info' : 'kus-dp-warn', previewBackup ? `バックアップ（反映前のプレビュー）: 保存しました（項目: ${previewBackup.scopes.map(reflectSectionLabel).join('、')}）` : 'バックアップ（反映前のプレビュー）: 保存していません。');
    previewNote.dataset.backupPreview = previewBackup ? 'saved' : 'none';
    resultNotes.appendChild(previewNote);
    if (last.context.goal === 'production') {
      const backup = result.deploy?.backup;
      const note = el('div', backup ? 'kus-dp-info' : 'kus-dp-warn');
      note.dataset.backupProduction = backup ? 'saved' : 'none';
      note.textContent = backup ? `バックアップ（本番へ反映する前の本番）: ${backup.fileName}（反映前の本番設定）` : 'バックアップ（本番へ反映する前の本番）: 保存していません。';
      if (backup?.unavailableFiles?.length) {
        const warn = el('div', 'kus-dp-warn');
        warn.append(el('strong', '', `本体を保存できなかったファイル（${backup.unavailableFiles.length} 件）`));
        const ul = el('ul', 'kus-dp-issues');
        for (const file of backup.unavailableFiles.slice(0, 20)) ul.appendChild(el('li', '', `App ${file.appId} / ${file.name}（${file.reason}）`));
        warn.appendChild(ul);
        note.appendChild(warn);
      }
      resultNotes.appendChild(note);
    }
    resultNotes.appendChild(el('div', 'kus-dp-info', sourceUndoGuidance(last.context.goal, last.context.targetPending)));
  }

  function recordInput(last: SourceRunSnapshot): SourceRecordInput {
    return { ...last.context, finishedAt: last.finishedAt, result: last.result };
  }
  function exportName(base: string, ext: string, last: SourceRunSnapshot) {
    return buildExportFilename(base, ext, { appLabel: buildAppFilenameLabel(last.context.target.appId, last.context.target.name) });
  }
  saveJsonBtn.addEventListener('click', () => {
    const last = memory.lastRun;
    if (!last) return;
    downloadText(exportName('反映元から本番反映結果', 'json', last), stringifySourceDeployResultJson(recordInput(last)), 'application/json;charset=utf-8');
    panel.setStatus('結果JSONを保存しました。', 'ok');
  });
  saveRecordBtn.addEventListener('click', () => {
    const last = memory.lastRun;
    if (!last) return;
    downloadText(exportName('反映元から本番反映記録', 'md', last), buildSourceDeployRecordMarkdown(recordInput(last)), 'text/markdown;charset=utf-8');
    panel.setStatus('記録をMarkdownで保存しました。', 'ok');
  });
  copyRecordBtn.addEventListener('click', () => {
    const last = memory.lastRun;
    if (!last) return;
    void copyTextToClipboard(buildSourceDeployRecordMarkdown(recordInput(last))).then((ok) => panel.setStatus(ok ? '記録のMarkdownをコピーしました。' : 'コピーできませんでした。「記録をMarkdownで保存」を使ってください。', ok ? 'ok' : 'warn'));
  });
  openSettingsBtn.addEventListener('click', () => {
    const last = memory.lastRun;
    if (!last) return;
    window.open(`${window.location.origin}${appSettingsPath(last.context.target)}`, '_blank', 'noopener');
    panel.setStatus(`アプリ #${last.context.target.appId} の設定画面を開きました。`, 'info');
  });

  // ---------------------------------------------------------------------------
  // 実行
  // ---------------------------------------------------------------------------
  async function startRun() {
    if (busy || !confirmationReady() || !session) return;
    flushRecompose();
    const current = session;
    const run = sectionsToRun(current.composed, activeScopes());
    if (!run.length) return;
    const goal = currentGoal();
    const allowPendingChanges = pendingRequired && pendingAck.checkbox.checked;
    const target = current.identities.target;
    const source = current.identities.source;
    const context: RunContext = {
      goal,
      source: { appId: source.appId, guestId: source.guestId, name: source.name, environment: current.sourceEnvironment },
      target: { appId: target.appId, guestId: target.guestId, name: target.name },
      preserveTargetOnly: !!current.opts.preserveTargetOnly,
      lookupMap: { ...(current.opts.lookupMap || {}) },
      targetPending: current.preview.targetPending,
      allowPendingChanges,
      sections: run.map((section) => ({ sectionKey: section.sectionKey, label: section.label, selectedCount: section.selectedCount, totalCount: section.totalCount, editedCount: section.editedCount, items: section.plan.items || [] })),
      startedAt: new Date().toISOString()
    };
    // 選んだ変更がある項目だけを書き込む。送る設定は項目ごとに渡す（渡さない項目は既定の計画どおりに書き込まれてしまう）。
    const reflect: ReflectOptions = { ...current.opts, scopes: run.map((section) => section.sectionKey) };
    const composed = composedAfterMap(run);
    const previous = memory.lastRun;
    currentRunGoal = goal;
    clearConfirmation();
    running = true;
    progress = createApplyProgressView(applyHost, createApplyProgressRows(run.map((section) => section.sectionKey), (key) => run.find((section) => section.sectionKey === key)?.label || key));
    deployProgress?.dispose();
    deployProgress = goal === 'production' ? createProgressView(deployHost, 'deploy', [{ appId: target.appId, guestId: target.guestId, name: target.name, status: 'waiting' as DeployAppStatus }]) : null;
    if (!deployProgress) deployHost.replaceChildren();
    memory.lastRun = null;
    let wroteAnything = false;
    showStage('result');
    renderResultCard();
    const finish = (result: SourceDeployResult) => {
      const last: SourceRunSnapshot = { result, context, finishedAt: new Date().toISOString() };
      memory.lastRun = last;
      // 書き込んだため、実行前の差分の抽出は使えない。
      session = null;
      running = false;
      renderFinalProgress(last);
    };
    await runLite(goal === 'production' ? '反映先プレビューへ書き込み中…' : '反映先プレビューへ反映中…', async () => {
      let result: SourceDeployResult;
      try {
        result = await runSourceToProductionStandalone({
          reflect, reviewBaseline: current.preview.baseline, composed, goal,
          targetPending: current.preview.targetPending, allowPendingChanges,
          onSectionUpdate: (update: ReflectSectionUpdate) => {
            if (update.status === 'running' || update.status === 'ok' || update.status === 'ng') wroteAnything = true;
            progress?.update(update);
          },
          onDeployUpdate: (update) => { wroteAnything = true; deployProgress?.update(update); },
          setStatus: (message) => panel.setStatus(message, 'busy')
        });
      } catch (error: any) {
        const reason = String(error?.message || error || '不明なエラー');
        if (!wroteAnything) {
          // 書き込み前の検査で止まった。直前の結果へ戻し、差分を取り直せる画面へ戻る。
          running = false;
          memory.lastRun = previous;
          if (previous) renderFinalProgress(previous);
          renderResultCard();
          showStage('edit');
          throw error;
        }
        // 書き込みの途中で想定外の例外。進捗の表示から結果を組み立て、状態の確認を促す。
        const rows = progress?.rows() || [];
        finish({
          goal,
          apply: {
            logs: [`エラー: ${reason}`], finalRevision: '',
            sections: run.map((section) => {
              const row = rows.find((candidate) => candidate.sectionKey === section.sectionKey);
              const status = row?.status === 'ok' || row?.status === 'skip' || row?.status === 'ng' ? row.status : row?.status === 'running' ? 'ng' : 'pending';
              return { sectionKey: section.sectionKey, label: section.label, status, message: status === 'ng' ? (row?.message || `処理が中断されました。反映先プレビューの状態を確認してください。（${reason}）`) : status === 'pending' ? '実行前に処理が止まりました。' : row?.message, ...(row?.stopped ? { stopped: true } : {}) };
            })
          },
          deploySkipped: goal === 'production' ? `実行中にエラーが発生したため、本番の状態をアプリの設定画面で確認してください。（${reason}）` : undefined
        });
        renderResultCard();
        throw new Error(`実行中にエラーが発生しました。反映先と本番の状態をアプリの設定画面で確認してください。（${reason}）`);
      }
      finish(result);
      if (result.apply.logs?.length) panel.setResult(result.apply.logs.join('\n'));
      renderResultCard();
      const message = describeSourceDeployResult(result);
      panel.setStatus(message.text, message.tone);
    });
    running = false;
    renderResultCard();
    refreshWorkflow();
  }
  runBtn.addEventListener('click', () => { void startRun(); });

  // ---------------------------------------------------------------------------
  // 5 段階のナビゲーション・固定フッター
  // ---------------------------------------------------------------------------
  const nav = el('nav', 'kus-dp-nav kus-dp-nav--five');
  nav.setAttribute('aria-label', '反映元アプリから本番への手順');
  nav.setAttribute('role', 'tablist');
  const stageDefs: Array<{ id: SourceStage; number: string; label: string; copy: string }> = [
    { id: 'setup', number: '1', label: '対象を選ぶ', copy: '反映元・反映先・項目' },
    { id: 'select', number: '2', label: '差分を選ぶ', copy: '設定値を 1 つずつ選ぶ' },
    { id: 'edit', number: '3', label: '内容を修正', copy: '値を直してから確認' },
    { id: 'confirm', number: '4', label: '最終確認', copy: '経路と削除を確かめる' },
    { id: 'result', number: '5', label: '結果', copy: '結果を見て次の操作を選ぶ' }
  ];
  const stages = {} as Record<SourceStage, HTMLElement>;
  const navButtons = {} as Record<SourceStage, HTMLButtonElement>;
  for (const def of stageDefs) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'kus-dp-nav__btn';
    button.id = `kus-ds-tab-${def.id}`;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', `kus-ds-stage-${def.id}`);
    button.innerHTML = `<span class="kus-dp-nav__num">${def.number}</span><span>${def.label}<small class="kus-dp-nav__copy">${def.copy}</small></span>`;
    nav.appendChild(button);
    navButtons[def.id] = button;
    const stage = document.createElement('section');
    stage.className = 'kus-dp-stage';
    stage.id = `kus-ds-stage-${def.id}`;
    stage.dataset.stage = def.id;
    stage.setAttribute('role', 'tabpanel');
    stage.setAttribute('aria-labelledby', button.id);
    stages[def.id] = stage;
    button.addEventListener('click', () => { if (def.id === 'confirm') openConfirmation(); else showStage(def.id); });
    button.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const count = stageDefs.length;
      const index = stageDefs.findIndex((item) => item.id === def.id);
      const enabledAt = (at: number) => !navButtons[stageDefs[at].id].disabled;
      let next = -1;
      if (event.key === 'Home' || event.key === 'End') next = stageDefs.map((_, at) => (event.key === 'Home' ? at : count - 1 - at)).find(enabledAt) ?? -1;
      else {
        const direction = event.key === 'ArrowRight' ? 1 : -1;
        for (let step = 1; step < count; step += 1) { const at = (index + direction * step + count) % count; if (enabledAt(at)) { next = at; break; } }
      }
      if (next < 0 || next === index) return;
      if (stageDefs[next].id === 'confirm') openConfirmation(); else showStage(stageDefs[next].id);
    });
  }
  const heads: Record<SourceStage, [string, string]> = {
    setup: ['どの設定を、どのアプリへ反映しますか？', '反映元と反映先、反映する項目、目標を選びます。次の画面で差分を抽出します（この時点では書き込みません）。'],
    select: ['反映する差分を選ぶ', '反映元との差分を、設定値 1 つずつ選びます（例: 「必須」だけ反映し、表示名は反映しない）。この画面では書き込みません。'],
    edit: ['反映する内容を修正する', '主な値は入力欄で、残りは「JSONで編集」で直せます。JSONで直した項目は、選択・入力欄より JSON を優先します。直さない場合は、そのまま最終確認へ進めます。'],
    confirm: ['反映先と内容の最終確認', '経路・項目・削除される設定・バックアップ・取り消し方を確認してから実行します。'],
    result: ['実行結果と次の操作', 'プレビューへの書き込みと、本番への反映の結果を確認します。']
  };
  for (const def of stageDefs) {
    const head = el('header', 'kus-dp-stage-head');
    head.append(el('h2', '', heads[def.id][0]), el('p', '', heads[def.id][1]));
    stages[def.id].appendChild(head);
  }
  stages.setup.appendChild(setupStage);
  stages.select.appendChild(selectView.root);
  stages.edit.appendChild(editView.root);
  stages.confirm.appendChild(confirmCard.card);
  stages.result.append(resultCard.card, resultEmpty);

  const dock = el('div', 'kus-dp-action-dock');
  const dockRow = el('div', 'kus-dp-dock-row');
  const dockCopy = el('div', 'kus-dp-dock-copy');
  dockCopy.setAttribute('aria-live', 'polite');
  const dockActions = el('div', 'kus-dp-dock-actions');
  const backBtn = makeButton('対象を変更', 'sub');
  const extractBtn = makeButton('差分を抽出する', 'primary');
  const toEditBtn = makeButton('内容の修正へ', 'primary');
  backBtn.addEventListener('click', () => {
    const back: Record<SourceStage, SourceStage> = { setup: 'setup', select: 'setup', edit: 'select', confirm: 'edit', result: 'setup' };
    showStage(back[activeStage]);
  });
  extractBtn.addEventListener('click', () => { void startExtract(); });
  toEditBtn.addEventListener('click', () => {
    flushRecompose();
    if (!session || !isFresh() || editEntryBlocker()) return;
    showStage('edit');
  });
  dockActions.append(backBtn, extractBtn, toEditBtn, confirmBtn, runBtn);
  dockRow.append(dockCopy, dockActions);
  dock.append(dockRow);

  const workspace = el('div', 'kus-dp-workspace');
  const canvas = el('main', 'kus-dp-canvas');
  workspace.append(nav, canvas);
  for (const def of stageDefs) canvas.appendChild(stages[def.id]);
  workspace.appendChild(detail.dialog);
  [stages.setup, stages.select, stages.edit, stages.confirm, stages.result].forEach((scope) => attachCardHelp(scope));

  const noInputSubmit = document.createElement('button');
  noInputSubmit.disabled = true;

  function selectedTotal(): number {
    return (session?.composed?.sections || []).filter((section) => activeScopes().includes(section.sectionKey)).reduce((sum, section) => sum + section.selectedCount, 0);
  }

  function dockTitle(): string {
    if (activeStage === 'setup') {
      const kind = currentKind();
      return `反映元 ${kind === 'json' ? '設定JSON' : `#${srcApp.value.trim() || '－'}`} → 反映先 #${tgtApp.value.trim() || '－'} · ${currentGoal() === 'production' ? '本番まで反映' : 'プレビューまで'}`;
    }
    if (activeStage === 'result') return memory.lastRun ? describeRoute(memory.lastRun.context.source.name, memory.lastRun.context.target.name, memory.lastRun.context.goal) : '実行結果';
    return `選んだ変更 ${selectedTotal()} 件 · ${currentGoal() === 'production' ? '本番まで反映' : 'プレビューまで'}`;
  }

  refreshWorkflow = () => {
    const fresh = isFresh();
    const blocker = activeStage === 'setup' ? setupBlocker() : '';
    const stageProblem = fresh ? stageBlocker() : '';
    backBtn.hidden = activeStage === 'setup';
    extractBtn.hidden = activeStage !== 'setup';
    toEditBtn.hidden = activeStage !== 'select';
    confirmBtn.hidden = activeStage !== 'edit';
    runBtn.hidden = activeStage !== 'confirm';
    backBtn.disabled = busy;
    extractBtn.disabled = busy || !!blocker;
    toEditBtn.disabled = busy || !fresh || !!editEntryBlocker();
    confirmBtn.disabled = busy || !fresh || !!stageProblem;
    setButtonText(backBtn, activeStage === 'select' ? '対象を変更' : activeStage === 'edit' ? '差分の選択に戻る' : activeStage === 'confirm' ? '内容の修正に戻る' : '対象を選び直す');
    setButtonText(extractBtn, fresh ? '抽出し直す' : '差分を抽出する');
    navButtons.select.disabled = !fresh;
    navButtons.edit.disabled = !fresh || !!editEntryBlocker();
    navButtons.confirm.disabled = !fresh || !!stageProblem || busy;
    let message = '';
    if (activeStage === 'setup') {
      message = blocker ? `次に進むには：${blocker}` : fresh ? '抽出済みの差分があります。「差分を選ぶ」へ進むか、抽出し直してください。' : '反映元と反映先の差分を抽出します。書き込みは行いません。';
    } else if (activeStage === 'select' || activeStage === 'edit') {
      message = !fresh ? '入力が変わりました。「対象を選ぶ」で差分を抽出し直してください。'
        : (activeStage === 'select' ? editEntryBlocker() : stageProblem) ? `次に進むには：${activeStage === 'select' ? editEntryBlocker() : stageProblem}`
        : activeStage === 'select' ? `${selectedTotal()} 件の変更を選んでいます。内容を修正するか、そのまま進めます。` : `${selectedTotal()} 件の変更を反映します。最終確認へ進んでください。`;
    } else if (activeStage === 'confirm') {
      message = confirmationReady() ? '内容を確認できました。実行すると反映先が変わります。'
        : pendingRequired ? '確認のチェック、未公開の変更の了承、入力をすると、実行できます。' : '確認のチェックと入力をすると、実行できます。';
    } else {
      message = busy ? '実行中です。終わるまでお待ちください。「中止」で、次の書き込みの前に止められます。' : memory.lastRun ? '結果を確認してください。' : 'まだ実行していません。';
    }
    const blocked = (activeStage === 'setup' && !!blocker) || ((activeStage === 'select' || activeStage === 'edit') && fresh && !!(activeStage === 'select' ? editEntryBlocker() : stageProblem));
    dockCopy.replaceChildren(el('strong', '', dockTitle()), el('span', `kus-dp-dock-msg${blocked ? ' kus-dp-dock-reason' : ''}`, message));
    panel.result.hidden = activeStage === 'confirm';
    // 入力欄での Enter が、書き込みを始めてはならない（確認・結果の画面では何も実行しない。差分の選択と修正では次へ進むだけ）。
    panel.setPrimaryAction(activeStage === 'setup' ? extractBtn : activeStage === 'select' ? toEditBtn : activeStage === 'edit' ? confirmBtn : noInputSubmit);
  };

  showStage = (active) => {
    if (active === 'confirm' && !confirmedToken) return;
    if ((active === 'select' || active === 'edit') && (!session || !isFresh())) return;
    if (activeStage === 'confirm' && active !== 'confirm') clearConfirmation();
    if (active === 'select') selectView.render();
    if (active === 'edit') { flushRecompose(); editView.render(); }
    activeStage = active;
    for (const def of stageDefs) {
      const selectedStage = def.id === active;
      stages[def.id].hidden = !selectedStage;
      navButtons[def.id].setAttribute('aria-selected', String(selectedStage));
      navButtons[def.id].tabIndex = selectedStage ? 0 : -1;
    }
    navButtons[active].focus({ preventScroll: true });
    canvas.scrollTo({ top: 0 });
    renderResultCard();
    refreshWorkflow();
  };

  // 非同期処理中は条件の編集と二重実行を防ぐ。解除後は現在の状態から再計算する（deploy-lite-ui の setBusy から呼ばれる）。
  function setBusy(value: boolean) {
    busy = value;
    nav.inert = value;
    // 実行中の進捗（読み上げ対象）を残すため、結果の段階は inert にしない。操作は呼び出し側の一括無効化で防ぐ。
    for (const def of stageDefs) stages[def.id].inert = value && def.id !== 'result';
    if (value) { refreshWorkflow(); renderResultCard(); return; }
    onInputsChangedQuiet();
    renderResultCard();
    refreshConfirmStateIfOpen();
    navButtons[activeStage].focus({ preventScroll: true });
  }
  function onInputsChangedQuiet() {
    const summary = describeDetail();
    detailSummary.textContent = summary.text;
    detailSummary.classList.toggle('kus-dp-detail-summary--warn', summary.warn);
    refreshWorkflow();
  }
  function refreshConfirmStateIfOpen() {
    if (activeStage === 'confirm' && confirmedToken) refreshConfirmState();
    else runBtn.disabled = true;
  }

  panel.root.addEventListener('kus-lite-dispose', () => { progress = null; deployProgress?.dispose(); window.clearTimeout(composeTimer); }, { once: true });

  // 初期表示。開き直したときは、直近の実行結果が残っていれば結果から始める（差分の抽出は引き継がない）。
  ready = true;
  clearConfirmation();
  onInputsChanged();
  if (memory.lastRun) {
    currentRunGoal = memory.lastRun.context.goal;
    renderFinalProgress(memory.lastRun);
  }
  renderViews();
  for (const def of stageDefs) stages[def.id].hidden = def.id !== 'setup';
  showStage(memory.lastRun ? 'result' : 'setup');

  return {
    workspace,
    dock,
    deactivate() {
      shown = false;
      sourceNote.refresh();
      targetNote.refresh();
    },
    activate() {
      shown = true;
      dock.append(panel.status, panel.result);
      sourceNote.refresh();
      targetNote.refresh();
      refreshWorkflow();
      const last = memory.lastRun;
      if (last && activeStage === 'result') {
        if (last.result.apply.logs?.length) panel.setResult(last.result.apply.logs.join('\n'));
        const message = describeSourceDeployResult(last.result);
        panel.setStatus(message.text, message.tone);
      }
    },
    setBusy
  };
}
