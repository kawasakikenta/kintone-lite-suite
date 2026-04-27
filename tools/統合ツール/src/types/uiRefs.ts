'use strict';

/**
 * 統合ツールの DOM 要素レジストリの型定義。
 *
 * `boot.ts` の `ui = { ... }` 初期化で各 ID と DOM 要素を結びつけており、
 * 共有 `ui` オブジェクト経由でタブ/ハンドラ全体から参照される。
 *
 * 動的に追加される拡張プロパティ（`featureSortMode` 等、初期化後に注入される
 * もの）に対応するため、シグネチャインデックスで上書きを許容する。
 */

/**
 * `boot.ts` の `Object.assign(sharedUi, ui)` 完了時点で各 ID 要素は揃っている
 * 前提のため non-null として宣言する。テンプレ未生成の項目（lite-entry など、
 * 一部要素しか持たない部分マウント）では実行時 undefined となる可能性があるが、
 * その場合は呼び出し側で `?.` ガードを継続して入れる方針。
 */
export type UiInput = HTMLInputElement;
export type UiSelect = HTMLSelectElement;
export type UiTextArea = HTMLTextAreaElement;
export type UiButton = HTMLButtonElement;
export type UiEl = HTMLElement;

export interface KusUiRefs {
  // タブ & ペイン
  tabs: HTMLElement[];
  subTabs: HTMLElement[];
  panes: HTMLElement[];
  subPanes: HTMLElement[];

  // ダイアログ
  dialogHandle: UiEl;
  toolBody: UiEl;

  // 状態表示・結果ペイン
  status: UiEl;
  result: UiEl;

  // 接続設定: 比較元
  sourceApp: UiInput;
  sourceAppLabel: UiEl;
  sourceGuest: UiInput;
  sourceGuestLabel: UiEl;
  sourcePreview: UiInput;

  // 接続設定: 比較先
  targetApp: UiInput;
  targetAppLabel: UiEl;
  targetGuest: UiInput;
  targetGuestLabel: UiEl;
  targetPreview: UiInput;

  // 接続検索・プリセット
  connectionSearchKeyword: UiInput;
  connectionSearchGuest: UiInput;
  connectionSearchAssign: UiSelect;
  connectionSearchResult: UiEl;
  connectionPresetName: UiInput;
  connectionPresetSelect: UiSelect;
  connectionPresetSummary: UiEl;

  // 共通設定
  lookupMap: UiTextArea;
  ignoreKeys: UiTextArea;
  ignorePresetFieldOrder: UiInput;
  ignorePresetMeta: UiInput;
  ignorePresetLabelName: UiInput;

  // 差分: 正規化
  diffNormalizeViewOrder: UiInput;
  diffNormalizePermissionOrder: UiInput;
  diffNormalizeGeneralArrayOrder: UiInput;

  // 差分: 検索/フィルタ
  diffSearch: UiInput;
  diffSearchFieldName: UiInput;
  diffFilterSection: UiSelect;
  diffFilterType: UiSelect;
  diffFilterSeverity: UiSelect;
  diffFilterTableOnly: UiInput;
  diffFilterTableKeyword: UiInput;
  diffActiveFilters: UiEl;

  // 差分: エクスポート/レビュー/その他
  diffExportMode: UiSelect;
  diffExportContent: UiSelect;
  diffFavoritesOnlyBtn: UiButton;
  diffSelectionState: UiEl;
  diffOnboarding: UiEl;
  diffSelectionSetName: UiInput;
  diffSelectionSetSelect: UiSelect;
  diffWarnThreshold: UiInput;
  diffWarnBox: UiEl;
  diffSuggestedIgnore: UiEl;
  ignoreDefaultChips: UiEl;
  ignoreImpactPreview: UiEl;
  ignorePresetName: UiInput;
  ignorePresetSelect: UiSelect;
  diffMultiTargets: UiTextArea;
  diffMultiTargetResult: UiEl;
  charDiff: UiInput;
  diffIncludeSame: UiInput;
  diffThemeBtn: UiButton;
  diffScopes: UiEl;

  // 共通データ・接続インジケーター
  commonDataState: UiEl;
  step1Indicator: UiEl;
  step2Indicator: UiEl;
  step3Indicator: UiEl;
  connectionSummaryInline: UiEl;
  connectionToggleBtn: UiButton;
  connectionStep1Body: UiEl;
  connectionPanel: UiEl;

  // バンドルファイル
  bundleState: UiEl;
  sourceBundleFile: UiInput;
  targetBundleFile: UiInput;

  // 反映: スコープ・モード
  applyScopes: UiEl;
  applyScopeBlock: UiEl;
  sectionOptionsBlock: UiEl;
  reflectMode: UiSelect;
  reflectHint: UiEl;
  applyDiffOnly: UiInput;
  reflectApplyChecklist: UiEl;
  reflectChecklistStatus: UiEl;
  autoBackupPreview: UiInput;
  backupStatus: UiEl;
  stopOnError: UiInput;
  nodeMode: UiInput;
  reflectSimpleMode: UiInput;
  modeSectionBtn: UiButton;
  modeNodeBtn: UiButton;

  // ノードフィルタ
  nodeFilterBlock: UiEl;
  nodeSearch: UiInput;
  nodeFilterSection: UiSelect;
  nodeFilterType: UiSelect;
  nodeFilterSeverity: UiSelect;
  nodePropertyPanel: UiEl;
  nodePropertyList: UiEl;
  nodePropertyChips: UiEl;
  activeFilterChips: UiEl;
  nodeWarn: UiEl;
  nodeControls: UiEl;

  // 反映: ワークベンチ
  reflectNodeWorkbench: UiEl;
  reflectNodeList: UiEl;
  reflectNodeDetail: UiEl;
  reflectPreviewPlayground: UiEl;
  sectionPreviewEditor: UiEl;
  reflectAssist: UiEl;
  reflectHowto: UiEl;
  reflectOverview: UiEl;
  reflectMainTitle: UiEl;
  reflectOptionsCard: UiEl;
  doDeploy: UiInput;

  // パッチ JSON
  patchJsonPanel: UiEl;
  patchJsonSummary: UiEl;
  patchJsonEditor: UiEl;

  // フィールド追加
  fieldJson: UiTextArea;
  overwriteField: UiInput;
  deployField: UiInput;
  fieldJsonFile: UiInput;
  sourceFieldListContainer: UiEl;
  sourceFieldTbody: UiEl;
  sourceFieldCheckAll: UiInput;

  // JS/CSS 設定
  jsconfigJson: UiTextArea;
  jsconfigFile: UiInput;
  jsconfigResult: UiEl;
  jsconfigPreview: UiInput;
  jsconfigDeployAfter: UiInput;

  // 設定一括取得
  settingsExportAppIds: UiTextArea;
  settingsExportSearchKeyword: UiInput;
  settingsExportSearchResult: UiEl;
  settingsExportGuest: UiInput;
  settingsExportPreview: UiInput;
  settingsExportIncludePluginConfig: UiInput;
  settingsExportScopes: UiEl;
  settingsExportResult: UiEl;

  // レコードバックアップ
  recordBackupView: UiInput;
  recordBackupViewSelect: UiSelect;
  recordBackupZipName: UiInput;
  recordBackupIncludeFiles: UiInput;
  recordBackupIncludeComments: UiInput;
  recordBackupResult: UiEl;

  // スコープピッカー
  scopePickerModal: UiEl;
  scopePickerTitle: UiEl;
  scopePickerSub: UiEl;

  // ER / プロセス図
  mermaidText: UiTextArea;
  mermaidView: UiEl;
  erLayout: UiSelect;
  erFieldDensity: UiSelect;
  erMaxDepth: UiInput;
  erExtraApps: UiInput;
  erIncludeSubtable: UiInput;
  erIncludeReverseLookup: UiInput;

  // ビジー / ガイドツアー
  busyOverlay: UiEl;
  busyText: UiEl;
  tourOverlay: UiEl;
  tourSpotlight: UiEl;
  tourCard: UiEl;
  tourStepLabel: UiEl;
  tourTitle: UiEl;
  tourBody: UiEl;
  tourProgress: UiEl;
  tourHint: UiEl;
  tourPrev: UiButton;
  tourNext: UiButton;

  // 機能ヘッダー
  featureTitle: UiEl;
  featureBreadcrumb: UiEl;
  featureConn: UiEl;

  // ランチャー
  launcherMenu: UiEl;
  launcherToggleMore: UiButton;
  launcherSearch: UiInput;
  launcherGroupFilters: UiEl;
  launcherActiveFilters: UiEl;
  launcherVisibleCount: UiEl;
  launcherEmptyState: UiEl;

  // 動的に注入される項目（後付け）
  featureSortMode?: UiSelect;
  shortcutHelpModal?: UiEl;

  // 作業履歴
  workHistoryPanel: UiEl;
  workHistorySummary: UiEl;
  workHistoryList: UiEl;

  // ヘルパー関数（boot.ts から注入）
  copyTextToClipboard: (text: string) => Promise<boolean>;
}

/**
 * 共有 ui レジストリの実体型。
 *
 * 厳密には起動完了 (Object.assign(sharedUi, ui)) までは空オブジェクトだが、
 * ハンドラやタブ層が触るタイミングは常に起動後のため non-null 前提とする。
 * lite-entry など一部要素しかマウントしない経路では `?.` ガードを呼び出し側
 * で残す。後付けされる動的キー（featureSortMode など）は index signature で許容。
 */
export type KusUiRegistry = KusUiRefs & Record<string, any>;
