'use strict';

export const TOOL_ID = 'kintone-unified-suite-v2';
export const TOOL_VERSION = '2.5.0';

export const DEFAULT_APP_ID = String(kintone.app.getId() || '');
export const DIALOG_STATE_KEY = `${TOOL_ID}:dialogState`;
export const DIFF_SNAPSHOT_STATE_KEY = `${TOOL_ID}:diffSnapshots`;
export const DIFF_SELECTION_SETS_KEY = `${TOOL_ID}:diffSelectionSets`;
export const DIFF_ONBOARDING_DISMISSED_KEY = `${TOOL_ID}:diffOnboardingDismissed`;
export const MAX_DIFF_SNAPSHOTS = 12;

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
  { key: 'fieldSettings', label: 'フィールド設定', endpoint: '/app/form/fields.json', put: true, putBuilder: (d) => ({ properties: d.properties || d }) },
  { key: 'layoutSettings', label: 'レイアウト設定', endpoint: '/app/form/layout.json', put: true, putBuilder: (d) => ({ layout: d.layout || d }) },
  { key: 'formSettings', label: 'フォーム設定', endpoint: '/form.json', put: false },
  { key: 'viewSettings', label: 'ビュー設定', endpoint: '/app/views.json', put: true, putBuilder: (d) => ({ views: d.views || d }) },
  { key: 'reportSettings', label: 'レポート設定', endpoint: '/app/reports.json', put: true, putBuilder: (d) => ({ reports: d.reports || d }) },
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

export const SETTINGS_EXPORT_SCOPE_DEFS = SECTION_DEFS.filter((s) => s.key !== 'customizeSettings');

export const FEATURE_DEFS = [
  { key: 'diff', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>', label: '差分比較', desc: '設定の差分を確認・比較', tabs: ['diff'] },
  { key: 'reflect', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>', label: 'プレビュー反映', desc: '比較元の設定を比較先プレビューへ反映', tabs: ['reflect'] },
  { key: 'field', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>', label: 'フィールド追加', desc: 'フィールド定義の追加・編集', tabs: ['field'] },
  { key: 'jsconfig', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>', label: 'JS/CSS設定', desc: 'カスタマイズ設定の取得・反映', tabs: ['jsconfig'] },
  { key: 'vis', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>', label: '可視化・出力', desc: 'ER図 / プロセス図 / 設計書 / 設定一括取得', tabs: ['er', 'processFlow', 'design', 'settingsExport'] },
  { key: 'data', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>', label: 'データ・保守', desc: 'レコード管理 / SQL実行 / APIテスター', tabs: ['recordMgr', 'sql', 'apiTester'] }
];

export const TAB_TO_FEATURE = {};
FEATURE_DEFS.forEach((f) => f.tabs.forEach((t) => { TAB_TO_FEATURE[t] = f.key; }));

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
  settingsExport: { appInputs: false, target: false, connectionActions: false }
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
  field: 'json',
  jsconfig: 'editor',
  recordMgr: 'status',
  er: 'diagram',
  settingsExport: 'export'
});

export const GUIDED_TOUR_STEPS = Object.freeze([
  {
    tab: 'diff',
    subTab: 'conditions',
    path: '差分比較 > 比較条件',
    selector: '#u_sourceApp',
    title: '1. 比較元 / 比較先を決める',
    body: '共通設定で比較元・比較先のアプリIDとゲストIDを入力します。次のステップのプリセットで、それぞれ本番APIとプレビューAPIのどちらから設定を読むかを決めます。'
  },
  {
    tab: 'diff',
    subTab: 'conditions',
    path: '差分比較 > 比較条件',
    selector: '#u_diffScopes',
    title: '3. 比較対象セクションを選ぶ',
    body: '差分比較で確認したい設定だけを選びます。まずはフィールド、レイアウト、ビュー、プロセス管理あたりから始めるのが見やすいです。'
  },
  {
    tab: 'diff',
    subTab: 'conditions',
    path: '差分比較 > 比較条件',
    selector: '#u_ignoreKeyInput',
    title: '4. ノイズ差分を減らす',
    body: '無視キーや正規化プリセットを使うと、順序違い・メタ情報の差分を抑えられます。比較が荒れるときはここを先に調整します。'
  },
  {
    tab: 'diff',
    subTab: 'conditions',
    path: '差分比較 > 比較条件',
    selector: '[data-act="runDiff"]',
    title: '5. 差分比較を実行する',
    body: '条件が決まったら差分比較を実行します。必要ならこのまま JSON / HTML / Excel / パッチJSON として保存できます。'
  },
  {
    tab: 'diff',
    subTab: 'view',
    path: '差分比較 > 結果整理',
    selector: '#u_diffSearch',
    title: '6. 結果を絞り込んで確認する',
    body: '比較結果はセクション、種別、重要度、検索で絞り込めます。ここで反映対象を見極めてから次のステップへ進みます。'
  },
  {
    tab: 'reflect',
    path: 'プレビュー反映',
    selector: '#u_footerPlan',
    title: '7. 反映プランを先に確認する',
    body: '画面下の固定バーから「反映プラン確認」を押し、API リクエスト内容や対象セクションを確認します。要約はメイン欄の「プラン要約」にも表示されます。'
  },
  {
    tab: 'reflect',
    path: 'プレビュー反映',
    selector: '#u_footerApply',
    title: '8. 比較先プレビューへ反映する',
    body: '固定バーの「比較元 → 比較先(プレビュー) 反映」で書き込みます。本番へのデプロイだけ行う場合は右側の「デプロイのみ」を使います。'
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
