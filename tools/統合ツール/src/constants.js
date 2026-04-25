'use strict';

export const TOOL_ID = 'kintone-unified-suite-v2';
export const TOOL_VERSION = '2.5.0';

/** 実行時に読み込む外部ライブラリ/CDN 一覧 */
export const EXTERNAL_LIBRARIES = Object.freeze({
  jszip: Object.freeze({
    version: '3.10.1',
    cdnUrl: 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'
  }),
  alasql: Object.freeze({
    version: '4',
    cdnCandidates: Object.freeze([
      'https://cdn.jsdelivr.net/npm/alasql@4/dist/alasql.min.js',
      'https://unpkg.com/alasql@4/dist/alasql.min.js',
      'https://cdn.jsdelivr.net/npm/alasql@4'
    ])
  }),
  cytoscape: Object.freeze({
    version: '3.28.1',
    cdnUrl: 'https://cdnjs.cloudflare.com/ajax/libs/cytoscape/3.28.1/cytoscape.min.js',
    altVersion: '3.26.0',
    altCdnUrl: 'https://cdn.jsdelivr.net/npm/cytoscape@3.26.0/dist/cytoscape.min.js'
  }),
  dagre: Object.freeze({
    version: '0.8.5',
    cdnUrl: 'https://cdn.jsdelivr.net/npm/dagre@0.8.5/dist/dagre.min.js'
  }),
  cytoscapeDagre: Object.freeze({
    version: '2.5.0',
    cdnUrl: 'https://cdn.jsdelivr.net/npm/cytoscape-dagre@2.5.0/cytoscape-dagre.min.js',
    altCdnUrl: 'https://cdn.jsdelivr.net/npm/cytoscape-dagre@2.5.0/cytoscape-dagre.js'
  }),
  googleFontsDmSansMono: Object.freeze({
    cdnUrl: 'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,600;0,9..40,700;1,9..40,400&family=DM+Mono:wght@400;500&display=swap'
  }),
  jsoneditor: Object.freeze({
    version: '9.10.3',
    cdnUrl: 'https://cdnjs.cloudflare.com/ajax/libs/jsoneditor/9.10.3/jsoneditor.min.js',
    cssUrl: 'https://cdnjs.cloudflare.com/ajax/libs/jsoneditor/9.10.3/jsoneditor.min.css'
  }),
  toastify: Object.freeze({
    version: '1.12.0',
    cdnUrl: 'https://cdn.jsdelivr.net/npm/toastify-js',
    cssUrl: 'https://cdn.jsdelivr.net/npm/toastify-js/src/toastify.min.css'
  }),
  driver: Object.freeze({
    version: '1.3.1',
    cdnUrl: 'https://cdn.jsdelivr.net/npm/driver.js@1.3.1/dist/driver.js.iife.js',
    cssUrl: 'https://cdn.jsdelivr.net/npm/driver.js@1.3.1/dist/driver.css'
  })
});

function resolveDefaultAppId() {
  try {
    if (typeof kintone !== 'undefined' && kintone?.app?.getId) {
      return String(kintone.app.getId() || '');
    }
  } catch (e) { /* ignore */ }
  return '';
}

export const DEFAULT_APP_ID = resolveDefaultAppId();
export const DIALOG_STATE_KEY = `${TOOL_ID}:dialogState`;
export const DIFF_SELECTION_SETS_KEY = `${TOOL_ID}:diffSelectionSets`;
export const DIFF_ONBOARDING_DISMISSED_KEY = `${TOOL_ID}:diffOnboardingDismissed`;
export const REFLECT_PRESETS_KEY = `${TOOL_ID}:reflectPresets`;

/** 差分ビュー用クイックプリセット（表示フィルタの一括切替） */
export const DIFF_UI_PRESETS = [
  { id: 'reset', label: 'フィルタ解除', hint: 'セクション・種別・重要度の絞り込みをクリア' },
  { id: 'severity_high', label: '高重要度', hint: '重要度「高」だけ表示' },
  { id: 'type_added', label: '追加のみ', hint: '追加差分だけ' },
  { id: 'type_removed', label: '削除のみ', hint: '削除差分だけ' },
  { id: 'type_changed', label: '変更のみ', hint: '変更差分だけ' },
  { id: 'sec_field', label: 'フィールド', hint: 'フィールド設定セクションに絞る' },
  { id: 'sec_layout', label: 'レイアウト', hint: 'レイアウト設定に絞る' },
  { id: 'sec_view', label: 'ビュー', hint: 'ビュー設定に絞る' },
  { id: 'sec_process', label: 'プロセス', hint: 'プロセス管理に絞る' },
  { id: 'no_acl', label: '権限系を隠す', hint: 'アプリ/フィールド/レコード権限のセクションを除外して表示' }
];

export const DIALOG_MARGIN = 16;
export const DIALOG_MIN_WIDTH = 560;
export const DIALOG_MIN_HEIGHT = 360;
export const DIALOG_DEFAULT_WIDTH = 980;
export const DIALOG_DEFAULT_HEIGHT = 860;
export const DIALOG_LARGE_WIDTH = 1240;
export const DIALOG_LARGE_HEIGHT = 940;

export const SECTION_DEFS = [
  { key: 'appSettings', label: 'アプリ設定', endpoint: '/app/settings.json', put: false },
  { key: 'appInfo', label: 'アプリ情報(ラベル)', endpoint: '/app.json', put: false, previewEndpoint: false, paramBuilder: (app) => ({ id: app }) },
  { key: 'fieldSettings', label: 'フィールド設定', endpoint: '/app/form/fields.json', put: true, putBuilder: (d) => ({ properties: d.properties || d }) },
  { key: 'layoutSettings', label: 'レイアウト設定', endpoint: '/app/form/layout.json', put: true, putBuilder: (d) => ({ layout: d.layout || d }) },
  { key: 'formSettings', label: 'フォーム設定', endpoint: '/form.json', put: false },
  { key: 'viewSettings', label: 'ビュー設定', endpoint: '/app/views.json', put: true, putBuilder: (d) => ({ views: d.views || d }) },
  { key: 'reportSettings', label: 'グラフ設定', endpoint: '/app/reports.json', put: true, putBuilder: (d) => ({ reports: d.reports || d }) },
  { key: 'processSettings', label: 'プロセス管理', endpoint: '/app/status.json', put: true, putBuilder: (d) => ({ enable: !!d.enable, states: d.states || {}, actions: d.actions || [] }) },
  { key: 'pluginSettings', label: 'プラグイン(※)', endpoint: '/app/plugins.json', put: true, putBuilder: (d) => ({ pluginIds: (d.plugins || []).map(p => p.id) }) },
  { key: 'customizeSettings', label: 'JS/CSS設定', endpoint: '/app/customize.json', put: true, putBuilder: (d) => ({ desktop: d.desktop || {}, mobile: d.mobile || {} }) },
  { key: 'actionSettings', label: 'アクション設定', endpoint: '/app/actions.json', put: true, putBuilder: (d) => ({ actions: d.actions || d }) },
  { key: 'appAcl', label: 'アプリ権限', endpoint: '/app/acl.json', put: true, putBuilder: (d) => ({ rights: d.rights || d }) },
  { key: 'fieldAcl', label: 'フィールド権限', endpoint: '/field/acl.json', put: true, putBuilder: (d) => ({ rights: d.rights || d }) },
  { key: 'recordPermissions', label: 'レコード権限', endpoint: '/record/acl.json', put: true, putBuilder: (d) => ({ rights: d.rights || d }) },
  { key: 'notifications', label: '通知設定', endpoint: '/app/notifications/general.json', put: true, putBuilder: (d) => ({ notifications: d.notifications || d }) },
  { key: 'perRecordNotifications', label: 'レコード条件通知', endpoint: '/app/notifications/perRecord.json', put: true, putBuilder: (d) => ({ notifications: d.notifications || d }) },
  { key: 'reminderNotifications', label: 'リマインダー通知', endpoint: '/app/notifications/reminder.json', put: true, putBuilder: (d) => ({ notifications: d.notifications || d }) },
  { key: 'categories', label: 'カテゴリ設定', endpoint: '/app/categories.json', put: true, putBuilder: (d) => ({ categories: d.categories || d }) }
];

export const SETTINGS_EXPORT_SCOPE_DEFS = SECTION_DEFS;

export { FEATURE_DEFS, TAB_TO_FEATURE } from './featureDefs.mjs';

/** 各タブが接続パネルのどの要素を必要とするかのマッピング */
export const TAB_CONNECTION_NEEDS = {
  diff:           { appInputs: true,  target: true,  connectionActions: true  },
  reflect:        { appInputs: true,  target: true,  connectionActions: true  },
  field:          { appInputs: true,  target: true,  connectionActions: false },
  jsconfig:       { appInputs: true,  target: true,  connectionActions: false },
  design:         { appInputs: true,  target: true,  connectionActions: false },
  recordMgr:      { appInputs: true,  target: true,  connectionActions: false },
  er:             { appInputs: true,  target: false, connectionActions: false },
  processFlow:    { appInputs: true,  target: false, connectionActions: false },
  sql:            { appInputs: true,  target: false, connectionActions: false },
  apiTester:      { appInputs: false, target: false, connectionActions: false },
  settingsExport: { appInputs: false, target: false, connectionActions: false },
  analyze:        { appInputs: true,  target: true,  connectionActions: false }
};


export const META_KEYS = new Set(['revision', 'creator', 'createdAt', 'modifier', 'modifiedAt']);

export const SYSTEM_FIELD_TYPES = new Set([
  'STATUS',
  'STATUS_ASSIGNEE',
  'CREATED_TIME',
  'UPDATED_TIME',
  'CREATOR',
  'MODIFIER',
  'RECORD_NUMBER',
  'CATEGORY'
]);

export const DEFAULT_SUBTAB_STATE = Object.freeze({
  diff: 'conditions',
  reflect: 'settings',
  field: 'json',
  jsconfig: 'editor',
  recordMgr: 'status',
  er: 'diagram',
  settingsExport: 'export',
  analyze: 'dashboard'
});

export const GUIDED_TOUR_STEPS = Object.freeze([
  {
    tab: 'diff',
    diffSubTab: 'conditions',
    path: 'ヘッダー > 比較条件',
    selector: '#u_sourceApp',
    title: '1. 比較元 / 比較先を決める',
    body: '上部の接続パネルで比較元・比較先のアプリIDとゲストIDを入力します。次のステップのプリセットで、それぞれ本番APIとプレビューAPIのどちらから設定を読むかを決めます。'
  },
  {
    tab: 'diff',
    diffSubTab: 'conditions',
    path: 'ヘッダー > 比較条件',
    selector: '[data-act="openDiffScopePicker"]',
    title: '3. 比較対象セクションを選ぶ',
    body: '「比較対象を選ぶ」からポップアップを開き、差分比較で確認したい設定だけを選びます。まずはフィールド、レイアウト、ビュー、プロセス管理あたりから始めるのが見やすいです。'
  },
  {
    tab: 'diff',
    diffSubTab: 'conditions',
    path: 'ヘッダー > 比較条件',
    selector: '#u_ignoreKeyInput',
    title: '4. ノイズ差分を減らす',
    body: '無視キーや正規化プリセットを使うと、順序違い・メタ情報の差分を抑えられます。比較が荒れるときはここを先に調整します。'
  },
  {
    tab: 'diff',
    diffSubTab: 'conditions',
    path: 'ヘッダー > 比較条件',
    selector: '#u_runDiffPrimary',
    title: '5. 差分比較を実行する',
    body: '条件が決まったら差分比較を実行します。必要ならこのまま JSON / HTML / Excel / パッチJSON として保存できます。'
  },
  {
    tab: 'diff',
    diffSubTab: 'conditions',
    path: 'ヘッダー > 差分結果の整理',
    selector: '#u_diffSearch',
    title: '6. 結果を絞り込んで確認する',
    body: '差分比較後は「差分結果の整理・出力」を開くと、セクション、種別、重要度、検索で絞り込めます。ここで反映対象を見極めてから次のステップへ進みます。'
  },
  {
    tab: 'reflect',
    path: 'プレビュー反映',
    selector: '#u_footerPlan',
    title: '7. 反映プランを先に確認する',
    body: '画面下の固定バーから「実行前プラン確認」を押し、API リクエスト内容や対象セクションを確認します。要約はメイン欄のプラン欄にも表示されます。'
  },
  {
    tab: 'reflect',
    path: 'プレビュー反映',
    selector: '#u_footerApply',
    title: '8. 比較先プレビューへ反映する',
    body: '固定バーの「プレビューへ反映」で比較先プレビューへ書き込みます。本番へのデプロイはkintone管理画面から手動で行います（ツールからのデプロイAPIは無効です）。'
  },
  {
    tab: 'design',
    subTab: 'export',
    path: '設計書 > 設計書出力',
    selector: '[data-act="exportDesignMd"]',
    title: '9. 最後に記録を残す',
    body: '作業後は設計書や差分レポートを出力して、変更内容を残します。複数アプリをまとめて保存したい場合は「設定一括取得」も使えます。'
  }
]);

export const HIGH_IMPACT_SECTIONS = new Set([
  'fieldSettings',
  'processSettings',
  'actionSettings',
  'appAcl',
  'fieldAcl',
  'recordPermissions'
]);

export const MEDIUM_IMPACT_SECTIONS = new Set([
  'layoutSettings',
  'viewSettings',
  'reportSettings',
  'customizeSettings',
  'notifications',
  'perRecordNotifications',
  'reminderNotifications',
  'categories'
]);

export const DIFF_IMPACT_REF_LIMIT = 6;

export const FIELD_REF_EXACT_KEYS = new Set([
  'code',
  'field',
  'entity',
  'targetField',
  'sortField',
  'groupFieldCode'
]);

export const FIELD_REF_ARRAY_KEYS = new Set([
  'fields',
  'displayFields',
  'columns'
]);

export const FIELD_REF_TOKEN_KEYS = new Set([
  'condition',
  'filterCond',
  'expression',
  'formula',
  'sort'
]);

/**
 * 差分選択ノードのクイックプリセット（反映タブの「差分から調整」モード用）
 * - sections: 含めるセクションキーの集合（undefined=全セクション）
 * - excludeSections: 除外するセクションキー
 * - severities: 採用する重要度（undefined=全重要度）
 * - types: 採用する差分種別
 * - excludeSystemFields: true の場合、システムフィールド差分を対象外（fieldSettings専用）
 * - mode: 既定のノードモード（'src' / 'tgt'）
 */
export const REFLECT_QUICK_PRESETS = [
  {
    id: 'all',
    label: 'すべての候補',
    hint: '全ノードを選択し、反映元は比較元に揃えます',
    mode: 'src'
  },
  {
    id: 'fieldsOnly',
    label: 'フィールドのみ',
    hint: 'フィールド設定の差分だけ選択します',
    sections: ['fieldSettings'],
    excludeSystemFields: true,
    mode: 'src'
  },
  {
    id: 'viewsAndReports',
    label: 'ビュー+グラフ',
    hint: 'ビュー設定・グラフ設定だけ選択',
    sections: ['viewSettings', 'reportSettings'],
    mode: 'src'
  },
  {
    id: 'highOnly',
    label: '高重要度のみ',
    hint: '重要度「高」の差分だけを選択',
    severities: ['high'],
    mode: 'src'
  },
  {
    id: 'addedOnly',
    label: '追加のみ',
    hint: '追加差分だけ選択（既存設定は残す）',
    types: ['added'],
    mode: 'src'
  },
  {
    id: 'excludeAcl',
    label: '権限を除外',
    hint: 'アプリ/フィールド/レコード権限を除外して選択',
    excludeSections: ['appAcl', 'fieldAcl', 'recordPermissions'],
    mode: 'src'
  },
  {
    id: 'keepTarget',
    label: '比較先を維持',
    hint: '選択はそのまま、反映元を全て「比較先」に変更',
    keepSelection: true,
    mode: 'tgt'
  }
];

export const IGNORE_PRESET_KEYS = {
  fieldOrder: ['index', 'no', 'order'],
  meta: ['revision', 'createdAt', 'creator', 'modifiedAt', 'modifier', 'updatedAt', 'updatedBy'],
  labelName: ['name', 'label']
};

export const DIFF_NORMALIZATION_PRESETS = {
  viewOrder: {
    label: 'ビュー/グラフ/アクション順序',
    sections: new Set(['viewSettings', 'reportSettings', 'actionSettings']),
    ignoreKeys: new Set(['index', 'no', 'order']),
    unorderedArrays: true
  },
  permissionOrder: {
    label: '権限/通知/カテゴリ順序',
    sections: new Set(['appAcl', 'fieldAcl', 'recordPermissions', 'notifications', 'perRecordNotifications', 'reminderNotifications', 'categories']),
    ignoreKeys: new Set(['index', 'no', 'order']),
    unorderedArrays: true
  },
  generalArrayOrder: {
    label: 'すべて（プロセス等含む）の配列順序',
    sections: new Set(['fieldSettings', 'processSettings', 'layoutSettings', 'actionSettings', 'appAcl', 'fieldAcl', 'recordPermissions', 'viewSettings', 'reportSettings', 'customizeSettings', 'notifications', 'perRecordNotifications', 'reminderNotifications', 'categories']),
    ignoreKeys: new Set(['index', 'no', 'order']),
    unorderedArrays: true
  }
};

export const ARRAY_LCS_MAX_CELLS = 60000;
export const LINE_DIFF_MAX_CELLS = 90000;
export const CHAR_DIFF_MAX_CELLS = 20000;

export const ARRAY_KEY_CANDIDATES = [
  'code',
  'id',
  'name',
  'entity',
  'field',
  'status',
  'state',
  'app',
  'from',
  'to',
  'key'
];

export const DEFAULT_IGNORE_KEYS = new Set([
  'id',
  'appid',
  'revision',
  'createdat',
  'creator',
  'modifiedat',
  'modifier'
]);
